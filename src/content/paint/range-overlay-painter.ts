/**
 * @file range-overlay-painter.ts
 * @description Sole HighlightPainter: absolute DOM rects from live Ranges.
 *
 * Underscore stroke = a 2px baseline strip matching the text color (currentColor).
 * The strip lives in an open shadow root and adapts to page themes, Dark Reader,
 * and custom backgrounds without background halos.
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
@media (prefers-color-scheme: dark) {
  :host {
    color: #f5f5f5;
  }
}
:host-context(html[data-darkreader-scheme="dark"]),
:host-context(html[data-darkreader-mode]),
:host-context(html.dark),
:host-context(body.dark),
:host-context([data-theme="dark"]),
:host-context([data-color-mode="dark"]),
:host-context([data-bs-theme="dark"]) {
  color: #f5f5f5;
}
:host-context(html[data-darkreader-scheme="light"]),
:host-context(html.light),
:host-context(body.light),
:host-context([data-theme="light"]),
:host-context([data-color-mode="light"]),
:host-context([data-bs-theme="light"]) {
  color: #111111;
}
.underscore-paint-rect {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 0;
  height: ${STRIP_HEIGHT_PX}px;
  background-color: var(--underscore-color, currentColor);
  box-shadow: none;
}
`;

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
    this.detectAndApplyUnderscoreColor();
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
      this.themeObserver = new MutationObserver((mutations) => {
        let shouldRelayout = false;
        for (const m of mutations) {
          if (m.type === 'attributes') {
            shouldRelayout = true;
            break;
          }
          if (m.type === 'childList') {
            for (let i = 0; i < m.addedNodes.length; i++) {
              const node = m.addedNodes[i];
              if (
                node instanceof HTMLElement &&
                (node.tagName === 'STYLE' || node.tagName === 'LINK')
              ) {
                shouldRelayout = true;
                break;
              }
            }
            if (shouldRelayout) break;
            for (let i = 0; i < m.removedNodes.length; i++) {
              const node = m.removedNodes[i];
              if (
                node instanceof HTMLElement &&
                (node.tagName === 'STYLE' || node.tagName === 'LINK')
              ) {
                shouldRelayout = true;
                break;
              }
            }
            if (shouldRelayout) break;
          }
        }
        if (shouldRelayout) {
          this.onViewportChange();
        }
      });

      const docEl = document.documentElement;
      if (docEl) {
        this.themeObserver.observe(docEl, {
          attributes: true,
          attributeFilter: [
            'class',
            'data-theme',
            'data-color-mode',
            'data-darkreader-scheme',
            'data-darkreader-mode',
            'data-bs-theme',
            'style',
          ],
        });
      }
      if (document.body && document.body !== docEl) {
        this.themeObserver.observe(document.body, {
          attributes: true,
          attributeFilter: [
            'class',
            'data-theme',
            'data-color-mode',
            'data-darkreader-scheme',
            'data-darkreader-mode',
            'data-bs-theme',
            'style',
          ],
          childList: true,
        });
      }
      if (document.head) {
        this.themeObserver.observe(document.head, {
          childList: true,
        });
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

  private detectAndApplyUnderscoreColor(): void {
    if (!this.root) return;
    const { isDark } = detectPageLuminance();
    const color = isDark ? '#f5f5f5' : '#111111';
    this.root.style.setProperty('--underscore-color', color);
  }

  private relayoutAll(): void {
    this.detectAndApplyUnderscoreColor();
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

export interface PageLuminanceResult {
  hex: string;
  luminance: number;
  isDark: boolean;
}

/**
 * Detects the background luminance of the page by walking up the DOM
 * from body to documentElement, returning color info and dark/light classification.
 */
export function detectPageLuminance(target?: Element | null): PageLuminanceResult {
  let el: Element | null =
    target ??
    (typeof document !== 'undefined'
      ? document.body || document.documentElement
      : null);

  let colorString: string | null = null;

  while (el) {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      try {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          const alphaMatch = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
          if (!alphaMatch || parseFloat(alphaMatch[1]!) > 0) {
            colorString = bg;
            break;
          }
        }
      } catch {
        // Element cannot be queried for computed style
      }
    }
    el = el.parentElement;
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (colorString) {
    const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      r = parseInt(rgbMatch[1]!, 10);
      g = parseInt(rgbMatch[2]!, 10);
      b = parseInt(rgbMatch[3]!, 10);
    } else if (colorString.startsWith('#')) {
      const cleanHex = colorString.replace('#', '');
      if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0]! + cleanHex[0]!, 16);
        g = parseInt(cleanHex[1]! + cleanHex[1]!, 16);
        b = parseInt(cleanHex[2]! + cleanHex[2]!, 16);
      } else if (cleanHex.length >= 6) {
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
      }
    }
  }

  const toHex = (c: number): string => {
    const hexVal = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hexVal.length === 1 ? '0' + hexVal : hexVal;
  };
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // WCAG standard relative luminance formula
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
  const isDark = luminance < 0.5;

  return {
    hex,
    luminance,
    isDark,
  };
}
