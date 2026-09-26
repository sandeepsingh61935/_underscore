/**
 * @file range-overlay-painter.test.ts
 * @description Sole HighlightPainter: overlay paint + hit-test.
 *
 * Stroke is a white strip with difference blending, so the compositor
 * inverts per pixel (black-on-light, white-on-dark) with no theme state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RangeOverlayPainter } from '@/content/paint/range-overlay-painter';

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

  it('uses white difference blending with no theme detection in the paint stylesheet', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 80, 16)]);
    painter.paint('hl-dr', [range], 'yellow');

    const shadow = document.getElementById('underscore-paint-root')?.shadowRoot;
    const paintStyle = shadow?.querySelector('style[data-underscore-paint]');
    expect(paintStyle).toBeTruthy();
    expect(paintStyle?.textContent).toContain('background-color: #ffffff');
    expect(paintStyle?.textContent).toContain('mix-blend-mode: difference');
    expect(paintStyle?.textContent).not.toContain('--underscore-color');
    expect(paintStyle?.textContent).not.toContain(':host-context');
    expect(paintStyle?.textContent).not.toContain('linear-gradient');
    expect(paintStyle?.textContent).not.toContain('prefers-color-scheme');
  });

  it('sets no theme color property for dark or light page backgrounds', () => {
    for (const bg of ['rgb(30, 30, 30)', 'rgb(255, 255, 255)', 'transparent']) {
      RangeOverlayPainter.resetForTests();
      document.body.innerHTML = '<p id="p">hello world of highlights</p>';
      document.body.style.backgroundColor = bg;
      const painter = RangeOverlayPainter.getInstance();
      const range = rangeOver('hello');
      stubClientRects(range, [stubRect(10, 20, 40, 14)]);

      painter.paint(`hl-bg-${bg}`, [range], 'yellow');

      const root = document.getElementById('underscore-paint-root') as HTMLElement;
      expect(root).toBeTruthy();
      expect(root.style.getPropertyValue('--underscore-color')).toBe('');
    }
  });

  it('keeps rects stable across theme toggle without any color state', async () => {
    document.body.style.backgroundColor = 'rgb(20, 20, 20)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-theme-change', [range], 'yellow');
    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root.style.getPropertyValue('--underscore-color')).toBe('');

    // Simulate switching to light theme: blending adapts, no JS color update.
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    window.dispatchEvent(new Event('resize'));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    expect(root.style.getPropertyValue('--underscore-color')).toBe('');
    const rects = paintScope().querySelectorAll('[data-highlight-id="hl-theme-change"]');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('avoids frozen inline styles and does not paint dual background gradient', () => {
    const p = document.getElementById('p')!;
    p.style.color = 'rgb(42, 42, 42)';

    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-dark', [range], 'yellow');

    const rect = paintScope().querySelector('.underscore-paint-rect') as HTMLElement;
    expect(rect).toBeTruthy();
    // Color should not be frozen with an inline style, allowing blend compositing
    expect(rect.style.color).toBe('');
    expect(rect.style.background).not.toContain('linear-gradient');
    expect(rect.hasAttribute('data-darkreader-ignore')).toBe(false);
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
