/**
 * @file range-overlay-painter.test.ts
 * @description Sole HighlightPainter: overlay paint + hit-test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RangeOverlayPainter, detectPageLuminance } from '@/content/paint/range-overlay-painter';

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

  it('defines single-tone currentColor stroke and theme adaptation rules in the paint stylesheet', () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 80, 16)]);
    painter.paint('hl-dr', [range], 'yellow');

    const shadow = document.getElementById('underscore-paint-root')?.shadowRoot;
    const paintStyle = shadow?.querySelector('style[data-underscore-paint]');
    expect(paintStyle).toBeTruthy();
    expect(paintStyle?.textContent).toContain('background-color: var(--underscore-color, currentColor)');
    expect(paintStyle?.textContent).not.toContain('linear-gradient');
    expect(paintStyle?.textContent).toContain(':host-context');
    expect(paintStyle?.textContent).toContain('data-darkreader-scheme="dark"');
    expect(paintStyle?.textContent).toContain('prefers-color-scheme: dark');
  });

  it('sets --underscore-color to #f5f5f5 for dark page background', () => {
    document.body.style.backgroundColor = 'rgb(30, 30, 30)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-dark-bg', [range], 'yellow');

    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#f5f5f5');
  });

  it('sets --underscore-color to #111111 for light page background', () => {
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-light-bg', [range], 'yellow');

    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#111111');
  });

  it('re-evaluates --underscore-color on relayout when page theme changes', async () => {
    document.body.style.backgroundColor = 'rgb(20, 20, 20)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-theme-change', [range], 'yellow');
    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#f5f5f5');

    // Simulate switching to light theme (e.g. disabling Dark Reader or theme toggle)
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    window.dispatchEvent(new Event('resize'));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    expect(root.style.getPropertyValue('--underscore-color')).toBe('#111111');
  });

  it('re-evaluates --underscore-color when dark reader attribute and background change', async () => {
    document.documentElement.setAttribute('data-darkreader-scheme', 'dark');
    document.body.style.backgroundColor = 'rgb(24, 26, 27)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-dr-toggle', [range], 'yellow');
    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#f5f5f5');

    // Turning off Dark Reader: attribute removed, background becomes white
    document.documentElement.removeAttribute('data-darkreader-scheme');
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    expect(root.style.getPropertyValue('--underscore-color')).toBe('#111111');
  });

  it('sets --underscore-color when background is on documentElement instead of body', () => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'rgb(18, 18, 18)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-doc-bg', [range], 'yellow');

    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#f5f5f5');
    document.documentElement.style.backgroundColor = '';
  });

  it('updates --underscore-color and rect positions on zoom/scroll simulation', async () => {
    document.body.style.backgroundColor = 'rgb(30, 30, 30)';
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);

    painter.paint('hl-zoom', [range], 'yellow');
    const root = document.getElementById('underscore-paint-root') as HTMLElement;
    expect(root.style.getPropertyValue('--underscore-color')).toBe('#f5f5f5');

    // Simulate zoom out: DOM updates, background changes to light
    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    stubClientRects(range, [stubRect(5, 10, 20, 7)]);
    window.dispatchEvent(new Event('scroll'));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    expect(root.style.getPropertyValue('--underscore-color')).toBe('#111111');
    const rect = paintScope().querySelector('[data-highlight-id="hl-zoom"]') as HTMLElement;
    expect(rect).toBeTruthy();
    expect(rect.style.width).toBe('20px');
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
    // Color should not be frozen with an inline style, allowing reactive CSS cascade
    expect(rect.style.color).toBe('');
    expect(rect.style.background).not.toContain('linear-gradient');
    expect(rect.hasAttribute('data-darkreader-ignore')).toBe(false);
  });

  it('triggers relayout when documentElement theme attributes mutate', async () => {
    const painter = RangeOverlayPainter.getInstance();
    const range = rangeOver('hello');
    stubClientRects(range, [stubRect(10, 20, 40, 14)]);
    painter.paint('hl-theme-mut', [range], 'yellow');

    stubClientRects(range, [stubRect(10, 20, 50, 14)]);
    document.documentElement.setAttribute('data-darkreader-scheme', 'dark');

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    const rect = paintScope().querySelector('[data-highlight-id="hl-theme-mut"]') as HTMLElement;
    expect(rect).toBeTruthy();
    expect(rect.style.width).toBe('50px');
    document.documentElement.removeAttribute('data-darkreader-scheme');
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

describe('detectPageLuminance', () => {
  afterEach(() => {
    document.body.style.backgroundColor = '';
    document.documentElement.style.backgroundColor = '';
  });

  it('detects dark background on body', () => {
    document.body.style.backgroundColor = 'rgb(0, 0, 0)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(true);
    expect(result.hex).toBe('#000000');
    expect(result.luminance).toBeCloseTo(0, 2);
  });

  it('detects light background on body', () => {
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(false);
    expect(result.hex).toBe('#ffffff');
    expect(result.luminance).toBeCloseTo(1, 2);
  });

  it('detects mid-tone gray as dark (WCAG luminance < 0.5)', () => {
    document.body.style.backgroundColor = 'rgb(128, 128, 128)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(true);
    expect(result.luminance).toBeLessThan(0.5);
  });

  it('falls back to white for transparent background', () => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(false);
    expect(result.hex).toBe('#ffffff');
  });

  it('checks documentElement when body background is transparent', () => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'rgb(20, 20, 20)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(true);
    expect(result.hex).toBe('#141414');
  });

  it('treats rgba with alpha 0 as transparent and falls back to white', () => {
    document.body.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    document.documentElement.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(false);
    expect(result.hex).toBe('#ffffff');
  });

  it('detects dark background from non-zero alpha rgba', () => {
    document.body.style.backgroundColor = 'rgba(10, 10, 10, 0.9)';
    const result = detectPageLuminance();
    expect(result.isDark).toBe(true);
  });

  it('handles target element directly if provided', () => {
    const customDiv = document.createElement('div');
    customDiv.style.backgroundColor = 'rgb(240, 240, 240)';
    document.body.appendChild(customDiv);
    const result = detectPageLuminance(customDiv);
    expect(result.isDark).toBe(false);
    expect(result.hex).toBe('#f0f0f0');
    customDiv.remove();
  });
});

