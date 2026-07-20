/**
 * @file range-overlay-painter.ts
 * @description Sole HighlightPainter: absolute DOM rects from live Ranges.
 *
 * Underscore stroke = invert of sampled page background (with contrast floor).
 * colorRole is accepted for API stability but does not tint the on-page stroke.
 */

import type { FirstLineEdges, HighlightPainter } from './highlight-painter';
import { resolveUnderscoreStroke } from './highlight-contrast';
import { getFirstLineEdgeRects } from './first-line-geometry';
import { sampleBackgroundNearRange } from './sample-page-background';

import type { ColorRole } from '@/shared/schemas/highlight-schema';
import { resolveColorRoleForPaint } from '@/content/styles/highlight-styles';

const ROOT_ID = 'underscore-paint-root';
const STROKE_THICKNESS_PX = 2.5;

interface OverlayEntry {
  id: string;
  colorRole: ColorRole;
  ranges: Range[];
  elements: HTMLElement[];
}

export class RangeOverlayPainter implements HighlightPainter {
  private static instance: RangeOverlayPainter | null = null;

  private readonly entries = new Map<string, OverlayEntry>();
  private root: HTMLElement | null = null;
  private scrollScheduled = false;
  private listenersAttached = false;

  static getInstance(): RangeOverlayPainter {
    if (!RangeOverlayPainter.instance) {
      RangeOverlayPainter.instance = new RangeOverlayPainter();
    }
    return RangeOverlayPainter.instance;
  }

  static resetForTests(): void {
    if (RangeOverlayPainter.instance) {
      RangeOverlayPainter.instance.destroy();
      RangeOverlayPainter.instance = null;
    }
  }

  paint(id: string, ranges: Range[], colorRole: ColorRole): void {
    if (!id || !ranges?.length) return;

    const role = resolveColorRoleForPaint(colorRole);
    this.ensureRoot();
    this.ensureListeners();
    this.unpaint(id);

    const liveRanges = ranges.filter((r) => r && !r.collapsed);
    if (liveRanges.length === 0) return;

    const elements: HTMLElement[] = [];
    for (const range of liveRanges) {
      elements.push(...this.createRectsForRange(id, range));
    }
    if (elements.length === 0) return;

    this.entries.set(id, { id, colorRole: role, ranges: liveRanges, elements });
  }

  unpaint(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    for (const el of entry.elements) {
      el.remove();
    }
    this.entries.delete(id);

    if (this.entries.size === 0) {
      this.teardownListeners();
    }
  }

  clear(): void {
    for (const id of [...this.entries.keys()]) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      for (const el of entry.elements) el.remove();
      this.entries.delete(id);
    }
    this.teardownListeners();
    this.root?.remove();
    this.root = null;
  }

  hitTest(x: number, y: number): string | null {
    const hits: { id: string; textLen: number }[] = [];

    for (const entry of this.entries.values()) {
      for (const range of entry.ranges) {
        if (!this.pointInRange(range, x, y)) continue;
        let textLen = 0;
        try {
          textLen = range.toString().length;
        } catch {
          textLen = 0;
        }
        hits.push({ id: entry.id, textLen });
        break;
      }
    }

    if (hits.length === 0) return null;
    hits.sort((a, b) => a.textLen - b.textLen);
    return hits[0]!.id;
  }

  getBoundingClientRect(id: string): DOMRect | null {
    const edges = this.getFirstLineEdges(id);
    return edges?.end ?? null;
  }

  getFirstLineEdges(id: string): FirstLineEdges | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    return getFirstLineEdgeRects(entry.ranges);
  }

  destroy(): void {
    this.clear();
  }

  get paintedCount(): number {
    return this.entries.size;
  }

  private pointInRange(range: Range, x: number, y: number): boolean {
    try {
      if (typeof range.getClientRects !== 'function') return false;
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (
          rect &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return true;
        }
      }
    } catch {
      return false;
    }
    return false;
  }

  private ensureRoot(): HTMLElement {
    if (this.root && document.contains(this.root)) return this.root;

    let root = document.getElementById(ROOT_ID) as HTMLElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden', 'true');
      (document.documentElement || document.body).appendChild(root);
    }
    this.root = root;
    return root;
  }

  private createRectsForRange(id: string, range: Range): HTMLElement[] {
    const root = this.ensureRoot();
    let rects: DOMRectList | ArrayLike<DOMRect>;
    try {
      rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
    } catch {
      return [];
    }

    const bg = sampleBackgroundNearRange(range);
    const stroke = resolveUnderscoreStroke(bg);

    const created: HTMLElement[] = [];
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;

      const el = document.createElement('div');
      el.className = 'underscore-paint-rect';
      el.dataset['highlightId'] = id;
      el.style.boxShadow = `inset 0 -${STROKE_THICKNESS_PX}px 0 ${stroke}`;
      el.style.left = `${rect.left + scrollX}px`;
      el.style.top = `${rect.top + scrollY}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${Math.max(rect.height, 2)}px`;
      root.appendChild(el);
      created.push(el);
    }
    return created;
  }

  private ensureListeners(): void {
    if (this.listenersAttached) return;
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange, true);
    this.listenersAttached = true;
  }

  private teardownListeners(): void {
    if (!this.listenersAttached) return;
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange, true);
    this.listenersAttached = false;
  }

  private onViewportChange = (): void => {
    if (this.scrollScheduled) return;
    this.scrollScheduled = true;
    requestAnimationFrame(() => {
      this.scrollScheduled = false;
      this.relayoutAll();
    });
  };

  private relayoutAll(): void {
    for (const entry of this.entries.values()) {
      for (const el of entry.elements) el.remove();

      const next: HTMLElement[] = [];
      for (const range of entry.ranges) {
        if (!range || range.collapsed) continue;
        // Re-sample + re-invert on relayout (bg may change with theme/scroll sections).
        next.push(...this.createRectsForRange(entry.id, range));
      }
      entry.elements = next;
    }
  }
}

export function getHighlightPainter(): HighlightPainter {
  return RangeOverlayPainter.getInstance();
}

/** @deprecated Use getHighlightPainter() */
export function getRangeOverlayPainter(): HighlightPainter {
  return getHighlightPainter();
}
