import { describe, it, expect } from 'vitest';
import { buildPagerItems, clampPage } from './buildPagerItems';

describe('buildPagerItems', () => {
  it('returns empty for non-positive total', () => {
    expect(buildPagerItems(1, 0)).toEqual([]);
    expect(buildPagerItems(1, -3)).toEqual([]);
  });

  it('lists every page when total fits the window', () => {
    expect(
      buildPagerItems(2, 5).map((i) => (i.type === 'page' ? i.page : i.key))
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps boundaries and a window around current with ellipses', () => {
    const items = buildPagerItems(9, 20);
    expect(items).toEqual([
      { type: 'page', page: 1 },
      { type: 'ellipsis', key: 'e-1-8' },
      { type: 'page', page: 8 },
      { type: 'page', page: 9 },
      { type: 'page', page: 10 },
      { type: 'ellipsis', key: 'e-10-20' },
      { type: 'page', page: 20 },
    ]);
  });

  it('fills a single-page gap instead of ellipsis', () => {
    // current near start: 1,2,3 then gap of 1 before last boundary would collapse
    const items = buildPagerItems(3, 6);
    // total 6 with defaults fits full list (sibling*2+boundary*2+3 = 7 >= 6)
    expect(items.every((i) => i.type === 'page')).toBe(true);
    expect(items.map((i) => (i.type === 'page' ? i.page : null))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('clamps current into range', () => {
    const items = buildPagerItems(99, 10);
    expect(items[items.length - 1]).toEqual({ type: 'page', page: 10 });
    expect(items.some((i) => i.type === 'page' && i.page === 10)).toBe(true);
  });

  it('honors wider sibling windows', () => {
    const pages = buildPagerItems(10, 30, { siblingCount: 2, boundaryCount: 1 })
      .filter((i) => i.type === 'page')
      .map((i) => (i.type === 'page' ? i.page : -1));
    expect(pages).toContain(8);
    expect(pages).toContain(9);
    expect(pages).toContain(10);
    expect(pages).toContain(11);
    expect(pages).toContain(12);
    expect(pages).toContain(1);
    expect(pages).toContain(30);
  });
});

describe('clampPage', () => {
  it('clamps into 1..total', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(99, 5)).toBe(5);
    expect(clampPage(2.9, 5)).toBe(2);
    expect(clampPage(NaN, 5)).toBe(1);
    expect(clampPage(1, 0)).toBe(1);
  });
});
