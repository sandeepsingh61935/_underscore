/**
 * @file range-overlay-painter.ts
 * @description Sole HighlightPainter: absolute DOM rects from live Ranges.
 *
 * Underscore stroke = a 2px baseline strip painted in the highlight's own
 * rendered text color, sampled per Range from computed style. Sampling the
 * text element (not the page background, not an allow-list) tracks site dark
 * themes, prefers-color-scheme, and Dark Reader dynamic rewrites, since those
 * all change the computed text color. Filter/inversion modes keep working
 * because the overlay lives inside the filtered subtree and inverts along
 * with the page. Relayout re-samples, so theme toggles correct on next paint.
 * colorRole is accepted for API stability but does not tint the on-page stroke.
 */

import { getFirstLineEdgeRects } from './first-line-geometry';
import type { FirstLineEdges, HighlightPainter } from './highlight-painter';

import { resolveColorRoleForPaint } from '@/content/styles/highlight-styles';
import type { ColorRole } from '@/shared/schemas/highlight-schema';

const ROOT_ID = 'underscore-paint-root';
const STRIP_HEIGHT_PX = 2;
const UNDERLINE_OFFSET_PX = 2;
const PAINT_SHADOW_CSS = `
:host {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 2147483645;
  color: inherit;
}
.underscore-paint-rect {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 0;
  height: ${STRIP_HEIGHT_PX}px;
  box-shadow: none;
}
`;

/**
 * Sample the highlight's own rendered text color: walk up from the Range's
 * common ancestor to the first element with a non-transparent computed
 * color. Computed style already reflects site themes and Dark Reader dynamic
 * rewrites, so no theme allow-list or luminance math is needed.
 */
export function sampleTextColorNearRange(range: Range): string | null {
  let node: Node | null = null;
  try {
    node = range.commonAncestorContainer;
  } catch {
    return null;
  }
  let el: Element | null =
    node && node.nodeType === Node.TEXT_NODE
      ? (node as Text).parentElement
      : (node as Element | null);

  while (
    el &&
    typeof window !== 'undefined' &&
    typeof window.getComputedStyle === 'function'
  ) {
    try {
      const color = window.getComputedStyle(el).color;
      if (color) {
        const m = color.match(
          /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/
        );
        if (!m) return color;
        const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
        if (alpha > 0.01) return color;
      }
    } catch {
      // Element cannot be queried for computed style
    }
    el = el.parentElement;
  }
  return null;
}

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
  private layer: ShadowRoot | null = null;
  private scrollScheduled = false;
  private listenersAttached = false;
  private themeObserver: MutationObserver | null = null;
  private mediaQuery: MediaQueryList | null = null;

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

    // Keep the entry even with 0 rects (layout not ready). relayoutAll can paint later.
    this.entries.set(id, { id, colorRole: role, ranges: liveRanges, elements });
    if (elements.length === 0) {
      this.onViewportChange();
    }
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
    this.layer = null;
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
    if (this.root && document.contains(this.root) && this.layer) return this.root;

    let root = document.getElementById(ROOT_ID) as HTMLElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden', 'true');
      (document.body || document.documentElement).appendChild(root);
    }
    this.root = root;
    this.ensureLayer(root);
    return root;
  }

  private ensureLayer(host: HTMLElement): ShadowRoot {
    if (this.layer && this.layer.host === host) return this.layer;

    if (host.shadowRoot) {
      this.layer = host.shadowRoot;
    } else {
      host.replaceChildren();
      this.layer = host.attachShadow({ mode: 'open' });
    }

    if (!this.layer.querySelector('style[data-underscore-paint]')) {
      const style = document.createElement('style');
      style.dataset['underscorePaint'] = '';
      style.textContent = PAINT_SHADOW_CSS;
      this.layer.appendChild(style);
    }
    return this.layer;
  }

  private createRectsForRange(id: string, range: Range): HTMLElement[] {
    this.ensureRoot();
    const layer = this.layer;
    if (!layer) return [];

    let rects: DOMRectList | ArrayLike<DOMRect>;
    try {
      rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
    } catch {
      return [];
    }

    const created: HTMLElement[] = [];
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const ink = sampleTextColorNearRange(range) ?? 'currentColor';

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;

      const el = document.createElement('div');
      el.className = 'underscore-paint-rect';
      el.dataset['highlightId'] = id;
      el.style.left = `${rect.left + scrollX}px`;
      el.style.top = `${rect.top + scrollY + rect.height - 1 + UNDERLINE_OFFSET_PX}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${STRIP_HEIGHT_PX}px`;
      el.style.backgroundColor = ink;
      layer.appendChild(el);
      created.push(el);
    }
    return created;
  }

  private ensureListeners(): void {
    if (this.listenersAttached) return;
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange, true);

    if (typeof window.matchMedia === 'function') {
      try {
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener?.('change', this.onViewportChange);
      } catch {
        // matchMedia not supported or restricted in environment
      }
    }

    if (typeof MutationObserver !== 'undefined') {
      // No theme allow-list: any class/style change on html/body may restyle
      // text, and relayout re-samples each highlight's own text color.
      this.themeObserver = new MutationObserver(() => {
        this.onViewportChange();
      });
      const docEl = document.documentElement;
      if (docEl) {
        this.themeObserver.observe(docEl, { attributes: true });
      }
      if (document.body && document.body !== docEl) {
        this.themeObserver.observe(document.body, { attributes: true });
      }
    }

    this.listenersAttached = true;
  }

  private teardownListeners(): void {
    if (!this.listenersAttached) return;
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange, true);
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener?.('change', this.onViewportChange);
      this.mediaQuery = null;
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
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
