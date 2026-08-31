import { describe, it, expect } from 'vitest';

import { aggregateLibrary, type WebHighlight } from './aggregateLibrary';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 5, 12, 0, 0); // 2026-08-05T12:00:00Z

function hl(
  partial: Partial<WebHighlight> &
    Pick<WebHighlight, 'id' | 'domain' | 'path' | 'savedAt'>
): WebHighlight {
  return {
    quote: partial.quote ?? `quote-${partial.id}`,
    note: partial.note ?? '',
    tags: partial.tags ?? [],
    ...partial,
  };
}

describe('aggregateLibrary', () => {
  it('returns empty aggregates for empty rows', () => {
    const result = aggregateLibrary([], { now: NOW });

    expect(result.highlightCount).toBe(0);
    expect(result.domains).toEqual([]);
    expect(result.recent).toEqual([]);
    expect(result.currentPage).toBeNull();
    expect(result.stats).toEqual({
      highlightCount: 0,
      pageCount: 0,
      thisWeekCount: 0,
      notesCount: 0,
      tagCount: 0,
      planLabel: '',
    });
  });

  it('aggregates multi-domain tree with section counts and lastActive', () => {
    const rows = [
      hl({ id: '1', domain: 'a.com', path: '/docs', savedAt: NOW - 1 * DAY_MS }),
      hl({ id: '2', domain: 'a.com', path: '/docs', savedAt: NOW - 2 * DAY_MS }),
      hl({ id: '3', domain: 'a.com', path: '/blog', savedAt: NOW - 3 * DAY_MS }),
      hl({ id: '4', domain: 'b.com', path: '/', savedAt: NOW - 10 * DAY_MS }),
    ];

    const result = aggregateLibrary(rows, { now: NOW });

    expect(result.highlightCount).toBe(4);
    expect(result.stats.pageCount).toBe(3); // a/docs, a/blog, b/
    expect(result.domains).toHaveLength(2);

    // Domains ordered by lastActive desc
    const [first, second] = result.domains;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.domain).toBe('a.com');
    expect(first!.count).toBe(3);
    expect(first!.lastActive).toBe(NOW - 1 * DAY_MS);
    expect(first!.sections).toEqual(
      expect.arrayContaining([
        { path: '/docs', count: 2 },
        { path: '/blog', count: 1 },
      ])
    );

    expect(second!.domain).toBe('b.com');
    expect(second!.count).toBe(1);
    expect(second!.lastActive).toBe(NOW - 10 * DAY_MS);
    expect(second!.sections).toEqual([{ path: '/', count: 1 }]);
  });

  it('caps recent at 12 by default (newest first)', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      hl({
        id: String(i),
        domain: 'x.com',
        path: `/${i}`,
        savedAt: NOW - i * 1000,
      })
    );

    const result = aggregateLibrary(rows, { now: NOW });

    expect(result.recent).toHaveLength(12);
    expect(result.recent.map((r) => r.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i))
    );
  });

  it('respects custom recentCap', () => {
    const rows = [
      hl({ id: 'a', domain: 'x.com', path: '/', savedAt: NOW }),
      hl({ id: 'b', domain: 'x.com', path: '/', savedAt: NOW - 1 }),
      hl({ id: 'c', domain: 'x.com', path: '/', savedAt: NOW - 2 }),
    ];

    const result = aggregateLibrary(rows, { now: NOW, recentCap: 2 });
    expect(result.recent.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('counts thisWeek using savedAt within last 7 days of now (boundary inclusive)', () => {
    const rows = [
      hl({ id: 'inside', domain: 'x.com', path: '/', savedAt: NOW - 6 * DAY_MS }),
      hl({ id: 'edge', domain: 'x.com', path: '/', savedAt: NOW - 7 * DAY_MS }),
      hl({ id: 'outside', domain: 'x.com', path: '/', savedAt: NOW - 7 * DAY_MS - 1 }),
      hl({ id: 'now', domain: 'x.com', path: '/', savedAt: NOW }),
    ];

    const result = aggregateLibrary(rows, { now: NOW });

    // inside, edge (exactly 7d ago), now — not outside
    expect(result.stats.thisWeekCount).toBe(3);
  });

  it('derives currentPage as domain+path with most recent savedAt', () => {
    const rows = [
      hl({ id: 'old', domain: 'a.com', path: '/old', savedAt: NOW - 5 * DAY_MS }),
      hl({ id: 'mid', domain: 'b.com', path: '/page', savedAt: NOW - 2 * DAY_MS }),
      hl({ id: 'new-a', domain: 'c.com', path: '/hot', savedAt: NOW - 1000 }),
      hl({ id: 'new-b', domain: 'c.com', path: '/hot', savedAt: NOW - 2000 }),
      hl({ id: 'other', domain: 'c.com', path: '/other', savedAt: NOW - 3000 }),
    ];

    const result = aggregateLibrary(rows, { now: NOW });

    expect(result.currentPage).toEqual({
      domain: 'c.com',
      path: '/hot',
      sectionLabel: '/hot',
      highlightCount: 2,
    });
  });

  it('returns null currentPage when there are no rows', () => {
    expect(aggregateLibrary([], { now: NOW }).currentPage).toBeNull();
  });

  it('pageCount is unique domain+path pairs', () => {
    const rows = [
      hl({ id: '1', domain: 'a.com', path: '/x', savedAt: NOW }),
      hl({ id: '2', domain: 'a.com', path: '/x', savedAt: NOW }),
      hl({ id: '3', domain: 'a.com', path: '/y', savedAt: NOW }),
      hl({ id: '4', domain: 'b.com', path: '/x', savedAt: NOW }),
    ];

    expect(aggregateLibrary(rows, { now: NOW }).stats.pageCount).toBe(3);
  });

  it('counts notes and unique tags (case-insensitive, trimmed)', () => {
    const rows = [
      hl({
        id: '1',
        domain: 'a.com',
        path: '/',
        savedAt: NOW,
        note: '  keep  ',
        tags: ['React', 'css'],
      }),
      hl({
        id: '2',
        domain: 'a.com',
        path: '/',
        savedAt: NOW,
        note: '',
        tags: ['react', ' Hooks ', ''],
      }),
      hl({
        id: '3',
        domain: 'b.com',
        path: '/',
        savedAt: NOW,
        note: '   ',
        tags: ['CSS'],
      }),
    ];

    const stats = aggregateLibrary(rows, { now: NOW }).stats;
    expect(stats.notesCount).toBe(1);
    // react, css, hooks — unique case-insensitive
    expect(stats.tagCount).toBe(3);
  });
});
