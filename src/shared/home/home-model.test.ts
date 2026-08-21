import { describe, expect, it } from 'vitest';

import {
  buildActivePages,
  buildPopupHomeModel,
  homeGreeting,
} from './home-model';

describe('homeGreeting', () => {
  it('morning with name', () => {
    expect(homeGreeting({ name: 'Sam', hour: 9 })).toBe('Good morning, Sam');
  });

  it('evening without name', () => {
    expect(homeGreeting({ name: null, hour: 20 })).toBe('Good evening');
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
  it('first-run guest', () => {
    const m = buildPopupHomeModel({
      isAuthenticated: false,
      displayName: null,
      totalHighlights: 0,
      totalDomains: 0,
      tabDomain: 'example.com',
      tabPath: '/',
      currentPageHighlightCount: 0,
      recentCount: 0,
      hour: 10,
    });
    expect(m.emptyKind).toBe('first_run');
    expect(m.isGuest).toBe(true);
    expect(m.title).toBe('Local Library');
    expect(m.showCurrentPage).toBe(false);
  });

  it('signed-in with data shows greeting and current page', () => {
    const m = buildPopupHomeModel({
      isAuthenticated: true,
      displayName: 'Ada',
      totalHighlights: 12,
      totalDomains: 3,
      tabDomain: 'news.com',
      tabPath: '/a',
      currentPageHighlightCount: 2,
      recentCount: 5,
      hour: 14,
    });
    expect(m.emptyKind).toBeNull();
    expect(m.title).toBe('Good afternoon, Ada');
    expect(m.statusLine).toContain('12 highlights');
    expect(m.showCurrentPage).toBe(true);
    expect(m.currentPageEmpty).toBe(false);
  });

  it('current page empty when no tab domain', () => {
    const m = buildPopupHomeModel({
      isAuthenticated: true,
      displayName: null,
      totalHighlights: 1,
      totalDomains: 1,
      tabDomain: null,
      tabPath: null,
      currentPageHighlightCount: 0,
      recentCount: 1,
      hour: 9,
    });
    expect(m.currentPageEmpty).toBe(true);
  });
});
