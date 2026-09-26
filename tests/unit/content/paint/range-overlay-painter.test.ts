/**
 * @file range-overlay-painter.test.ts
 * @description Sole HighlightPainter: overlay paint + hit-test.
 *
 * Each strip is painted inline in the highlight's own rendered text color,
 * sampled per Range — so site themes and Dark Reader rewrites are tracked
 * with no theme state of our own.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RangeOverlayPainter, sampleTextColorNearRange } from '@/content/paint/range-overlay-painter';

function stubRect(left: number, top: number, width: number, height: number): DOMRect {
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

function paintScope(): ParentNode {
  const root = document.getElementById('underscore-paint-root');
  return root?.shadowRoot ?? root ?? document;
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
    expect(root?.shadowRoot).toBeTruthy();
    const rects = paintScope().querySelectorAll('.underscore-paint-rect');
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[0]?.getAttribute('data-highlight-id')).toBe('hl-1');
    expect(painter.paintedCount).toBe(1);
  });

  it('carries no blending or theme variables in the paint stylesheet', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 80, 16)]);
    painter.paint('hl-css', [range], 'yellow');

    const shadow = document.getElementById('underscore-paint-root')?.shadowRoot;
    const paintStyle = shadow?.querySelector('style[data-underscore-paint]');
    expect(paintStyle).toBeTruthy();
    expect(paintStyle?.textContent).not.toContain('mix-blend-mode');
    expect(paintStyle?.textContent).not.toContain('--underscore-color');
    expect(paintStyle?.textContent).not.toContain(':host-context');
    expect(paintStyle?.textContent).not.toContain('linear-gradient');
  });

  it('paints the strip in the highlight element text color on light pages', () => {
    const p = document.getElementById('p')!;
    p.style.color = 'rgb(17, 17, 17)';

    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-light', [range], 'yellow');

    const rect = paintScope().querySelector('.underscore-paint-rect') as HTMLElement;
    expect(rect).toBeTruthy();
    expect(rect.style.backgroundColor).toBe('rgb(17, 17, 17)');
  });

  it('paints the strip in the light text color on dark pages', () => {
    const p = document.getElementById('p')!;
    p.style.color = 'rgb(232, 230, 227)';
    document.body.style.backgroundColor = 'rgb(24, 26, 27)';

    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-dark', [range], 'yellow');

    const rect = paintScope().querySelector('.underscore-paint-rect') as HTMLElement;
    expect(rect).toBeTruthy();
    expect(rect.style.backgroundColor).toBe('rgb(232, 230, 227)');
  });

  it('re-samples the text color on relayout when the theme toggles', async () => {
    const p = document.getElementById('p')!;
    p.style.color = 'rgb(232, 230, 227)';

    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-toggle', [range], 'yellow');

    let rect = paintScope().querySelector('[data-highlight-id="hl-toggle"]') as HTMLElement;
    expect(rect.style.backgroundColor).toBe('rgb(232, 230, 227)');

    // Theme toggled back to light: text color changes, relayout re-samples.
    p.style.color = 'rgb(17, 17, 17)';
    window.dispatchEvent(new Event('resize'));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    rect = paintScope().querySelector('[data-highlight-id="hl-toggle"]') as HTMLElement;
    expect(rect.style.backgroundColor).toBe('rgb(17, 17, 17)');
  });

  it('relays rect geometry on resize', async () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-resize', [range], 'yellow');

    stubClientRects(range, [stubRect(10, 20, 50, 14)]);
    window.dispatchEvent(new Event('resize'));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    const rect = paintScope().querySelector('[data-highlight-id="hl-resize"]') as HTMLElement;
    expect(rect).toBeTruthy();
    expect(rect.style.width).toBe('50px');
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
    expect(paintScope().querySelectorAll('[data-highlight-id="a"]').length).toBe(0);
    expect(paintScope().querySelectorAll('[data-highlight-id="b"]').length).toBe(1);
  });

  it('keeps an entry when first layout has no rects so relayout can paint', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, []);
    painter.paint('hl-late', [range], 'yellow');
    expect(painter.paintedCount).toBe(1);

    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    window.dispatchEvent(new Event('resize'));

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const rects = paintScope().querySelectorAll('[data-highlight-id="hl-late"]');
        expect(rects.length).toBeGreaterThan(0);
        resolve();
      });
    });
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

describe('sampleTextColorNearRange', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="p">hello world of highlights</p>';
  });

  afterEach(() => {
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

  it('returns the element text color for a range', () => {
    document.getElementById('p')!.style.color = 'rgb(42, 42, 42)';
    expect(sampleTextColorNearRange(rangeOver('hello'))).toBe('rgb(42, 42, 42)');
  });

  it('skips transparent colors walking up to an opaque ancestor', () => {
    document.getElementById('p')!.style.color = 'rgba(0, 0, 0, 0)';
    document.body.style.color = 'rgb(232, 230, 227)';
    expect(sampleTextColorNearRange(rangeOver('hello'))).toBe('rgb(232, 230, 227)');
    document.body.style.color = '';
  });
});
