/**
 * @file range-overlay-painter.test.ts
 * @description Sole HighlightPainter: overlay paint + hit-test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RangeOverlayPainter } from '@/content/paint/range-overlay-painter';

function stubRect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
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

function stubClientRects(range: Range, rects: DOMRect[]): void {
  range.getClientRects = () => rects as unknown as DOMRectList;
}

describe('RangeOverlayPainter', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="p">hello world of highlights</p>';
    RangeOverlayPainter.resetForTests();
  });

  afterEach(() => {
    RangeOverlayPainter.resetForTests();
    document.body.innerHTML = '';
  });

  function rangeOver(text: string): Range {
    const p = document.getElementById('p')!;
    const node = p.firstChild as Text;
    const start = node.data.indexOf(text);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + text.length);
    return range;
  }

  it('paints overlay rects under #underscore-paint-root', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-1', [range], 'yellow');

    const root = document.getElementById('underscore-paint-root');
    expect(root).toBeTruthy();
    const rects = root!.querySelectorAll('.underscore-paint-rect');
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[0]?.getAttribute('data-highlight-id')).toBe('hl-1');
    expect(rects[0]?.getAttribute('data-color')).toBe('yellow');
    expect(painter.paintedCount).toBe(1);
  });

  it('hitTest returns id for point inside range geometry', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-hit', [range], 'yellow');

    expect(painter.hitTest(15, 25)).toBe('hl-hit');
    expect(painter.hitTest(0, 0)).toBeNull();
  });

  it('getBoundingClientRect returns first rect', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('world');
    const rect = stubRect(5, 6, 10, 12);
    stubClientRects(range, [rect]);
    painter.paint('hl-b', [range], 'blue');

    const got = painter.getBoundingClientRect('hl-b');
    expect(got).toEqual(rect);
    expect(painter.getBoundingClientRect('missing')).toBeNull();
  });

  it('unpaint removes only the target highlight', () => {
    const painter = RangeOverlayPainter.getInstance();
    const r1 = rangeOver('hello');
    const r2 = rangeOver('world');
    stubClientRects(r1, [stubRect(0, 0, 10, 10)]);
    stubClientRects(r2, [stubRect(20, 0, 10, 10)]);

    painter.paint('a', [r1], 'yellow');
    painter.paint('b', [r2], 'blue');
    expect(painter.paintedCount).toBe(2);

    painter.unpaint('a');
    expect(painter.paintedCount).toBe(1);
    expect(document.querySelectorAll('[data-highlight-id="a"]').length).toBe(0);
    expect(document.querySelectorAll('[data-highlight-id="b"]').length).toBe(1);
  });

  it('clear removes root and all rects', () => {
    const painter = RangeOverlayPainter.getInstance();
    const r = rangeOver('hello');
    stubClientRects(r, [stubRect(0, 0, 5, 5)]);

    painter.paint('x', [r], 'green');
    painter.clear();
    expect(painter.paintedCount).toBe(0);
    expect(document.getElementById('underscore-paint-root')).toBeNull();
  });
});
