/**
 * @file first-line-geometry.ts
 * @description First-line start/end rects + exterior icon placement math.
 */

const LINE_TOP_EPSILON_PX = 2;

export function collectClientRects(ranges: Range[]): DOMRect[] {
  const out: DOMRect[] = [];
  for (const range of ranges) {
    try {
      if (typeof range.getClientRects !== 'function') continue;
      const list = range.getClientRects();
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (r && r.width > 0 && r.height > 0) out.push(r);
      }
    } catch {
      // skip
    }
  }
  return out;
}

/**
 * First visual line: rects whose top is within epsilon of the minimum top.
 * Returns leftmost (start) and rightmost (end) rects on that line.
 */
export function getFirstLineEdgeRects(ranges: Range[]): {
  start: DOMRect;
  end: DOMRect;
} | null {
  const rects = collectClientRects(ranges);
  if (rects.length === 0) return null;

  let minTop = Infinity;
  for (const r of rects) {
    if (r.top < minTop) minTop = r.top;
  }

  const firstLine = rects.filter((r) => Math.abs(r.top - minTop) <= LINE_TOP_EPSILON_PX);
  if (firstLine.length === 0) return null;

  let start = firstLine[0]!;
  let end = firstLine[0]!;
  for (const r of firstLine) {
    if (r.left < start.left) start = r;
    if (r.right > end.right) end = r;
  }
  return { start, end };
}

export interface ExteriorIconPosition {
  left: number;
  top: number;
}

const DEFAULT_ICON_SIZE = 20;
const DEFAULT_GAP = 4;

/**
 * Place icon outside first-line wash: prefer right of end; flip left of start if clipped.
 * Document coordinates (include scroll).
 */
export function positionExteriorIcon(
  firstLineStart: DOMRect,
  firstLineEnd: DOMRect,
  options: {
    iconSize?: number;
    gap?: number;
    scrollX?: number;
    scrollY?: number;
    viewportWidth?: number;
  } = {}
): ExteriorIconPosition {
  const iconSize = options.iconSize ?? DEFAULT_ICON_SIZE;
  const gap = options.gap ?? DEFAULT_GAP;
  const scrollX =
    options.scrollX ?? (typeof window !== 'undefined' ? window.scrollX || 0 : 0);
  const scrollY =
    options.scrollY ?? (typeof window !== 'undefined' ? window.scrollY || 0 : 0);
  const viewportWidth =
    options.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1024);

  const midY = firstLineEnd.top + scrollY + (firstLineEnd.height - iconSize) / 2;

  const preferLeft = firstLineEnd.right + scrollX + gap;
  if (preferLeft + iconSize <= scrollX + viewportWidth) {
    return { left: preferLeft, top: midY };
  }

  return {
    left: firstLineStart.left + scrollX - gap - iconSize,
    top: midY,
  };
}
