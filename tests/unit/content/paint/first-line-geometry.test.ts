import { describe, expect, it } from 'vitest';

import {
  getFirstLineEdgeRects,
  positionExteriorIcon,
} from '@/content/paint/first-line-geometry';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function rangeWithRects(rects: DOMRect[]): Range {
  return {
    getClientRects: () => rects as unknown as DOMRectList,
    collapsed: false,
  } as unknown as Range;
}

describe('getFirstLineEdgeRects', () => {
  it('picks leftmost and rightmost on the top line', () => {
    const edges = getFirstLineEdgeRects([
      rangeWithRects([
        rect(10, 100, 40, 14),
        rect(50, 100, 30, 14),
        rect(10, 120, 80, 14),
      ]),
    ]);
    expect(edges).not.toBeNull();
    expect(edges!.start.left).toBe(10);
    expect(edges!.end.right).toBe(80);
    expect(edges!.end.top).toBe(100);
  });

  it('returns null when no rects', () => {
    expect(getFirstLineEdgeRects([rangeWithRects([])])).toBeNull();
  });
});

describe('positionExteriorIcon', () => {
  it('places icon to the right of first-line end when space allows', () => {
    const start = rect(10, 50, 20, 16);
    const end = rect(100, 50, 40, 16);
    const pos = positionExteriorIcon(start, end, {
      iconSize: 20,
      gap: 4,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
    });
    expect(pos.left).toBe(100 + 40 + 4);
    expect(pos.top).toBe(50 + (16 - 20) / 2);
  });

  it('flips to the left of first-line start near viewport right edge', () => {
    const start = rect(700, 50, 20, 16);
    const end = rect(760, 50, 30, 16);
    const pos = positionExteriorIcon(start, end, {
      iconSize: 20,
      gap: 4,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
    });
    expect(pos.left).toBe(700 - 4 - 20);
  });
});
