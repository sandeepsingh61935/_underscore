import { describe, expect, it } from 'vitest';

import {
  buildActivePages,
  buildPopupHomeModel,
  homeGreeting,
} from './home-model';

describe('homeGreeting', () => {
  it('morning with name (legacy helper)', () => {
    expect(homeGreeting({ name: 'Sam', hour: 9 })).toBe('Good morning, Sam');
  });
});

describe('buildActivePages', () => {
  const rows = [
    { id: '1', domain: 'a.com', path: '/x', savedAt: 100 },
    { id: '2', domain: 'a.com', path: '/x', savedAt: 200 },
    { id: '3', domain: 'b.com', path: '/', savedAt: 150 },
  ];

  it('aggregates counts and sorts by last active', () => {
    const pages = buildActivePages(rows, null, { excludeCurrent: false });
    expect(pages[0]).toMatchObject({ domain: 'a.com', path: '/x', count: 2 });
    expect(pages[1]).toMatchObject({ domain: 'b.com', count: 1 });
  });

  it('excludes current page when requested', () => {
    const pages = buildActivePages(
      rows,
      { domain: 'a.com', path: '/x' },
      { excludeCurrent: true },
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.domain).toBe('b.com');
  });
});

describe('buildPopupHomeModel', () => {
  const base = {
    displayName: null as string | null,
    totalHighlights: 0,
    totalDomains: 0,
    thisWeekCount: 0,
    todayCount: 0,
    tabDomain: 'example.com' as string | null,
    tabPath: '/',
    currentPageHighlightCount: 0,
    recentCount: 0,
  };

  it('first-run guest uses Local library title', () => {
    const m = buildPopupHomeModel({
      ...base,
      isAuthenticated: false,
    });
    expect(m.emptyKind).toBe('first_run');
    expect(m.isGuest).toBe(true);
    expect(m.title).toBe('Local library');
    expect(m.showCurrentPage).toBe(false);
  });

  it('signed-in with data uses Library title — no greeting theater', () => {
    const m = buildPopupHomeModel({
      ...base,
      isAuthenticated: true,
      displayName: 'Ada',
      totalHighlights: 12,
      totalDomains: 3,
      thisWeekCount: 4,
      todayCount: 1,
      tabDomain: 'news.com',
      tabPath: '/a',
      currentPageHighlightCount: 2,
      recentCount: 5,
    });
    expect(m.emptyKind).toBeNull();
    expect(m.title).toBe('Library');
    expect(m.title).not.toMatch(/Good /);
    expect(m.statusLine).toContain('12 highlights');
    expect(m.stats).toEqual({
      highlightCount: 12,
      domainCount: 3,
      thisWeekCount: 4,
      todayCount: 1,
    });
    expect(m.showCurrentPage).toBe(true);
    expect(m.currentPageEmpty).toBe(false);
  });

  it('current page empty when no tab domain', () => {
    const m = buildPopupHomeModel({
      ...base,
      isAuthenticated: true,
      totalHighlights: 1,
      totalDomains: 1,
      tabDomain: null,
      tabPath: null,
      recentCount: 1,
    });
    expect(m.currentPageEmpty).toBe(true);
  });
});
