import { describe, expect, it } from 'vitest';

import {
  ALL_SEARCH_FIELDS,
  formatMatchBadge,
  searchHighlights,
  type SearchableHighlight,
} from '@/shared/utils/highlight-search';

function makeHighlight(
  overrides: Partial<SearchableHighlight> = {}
): SearchableHighlight {
  return {
    id: 'h1',
    text: 'The quick brown fox',
    url: 'https://example.com/article',
    notes: 'Interesting point about foxes',
    tags: ['animals', 'nature'],
    ...overrides,
  };
}

describe('searchHighlights', () => {
  it('returns [] for an empty query', () => {
    const items = [makeHighlight()];
    expect(searchHighlights(items, '')).toEqual([]);
  });

  it('returns [] for a whitespace-only query', () => {
    const items = [makeHighlight()];
    expect(searchHighlights(items, '   ')).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    const items = [makeHighlight()];
    expect(searchHighlights(items, 'zzz-no-match')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const items = [makeHighlight({ text: 'The Quick Brown Fox' })];
    const results = searchHighlights(items, 'QUICK');
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedFields).toEqual(['text']);
  });

  it('defaults fields to ALL_SEARCH_FIELDS', () => {
    const items = [makeHighlight()];
    const withDefault = searchHighlights(items, 'fox');
    const withExplicit = searchHighlights(items, 'fox', ALL_SEARCH_FIELDS);
    expect(withDefault).toEqual(withExplicit);
  });

  it('treats an empty fields array as user-facing fields (All chip scope)', () => {
    const items = [
      makeHighlight({ text: 'the telephone', notes: undefined, tags: undefined }),
    ];
    const results = searchHighlights(items, 'telephone', []);
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedFields).toEqual(['text']);
  });

  it('preserves input order and does not dedupe', () => {
    const a = makeHighlight({
      id: 'a',
      text: 'fox in a hat',
      notes: undefined,
      tags: undefined,
    });
    const b = makeHighlight({
      id: 'b',
      text: 'another fox',
      notes: undefined,
      tags: undefined,
    });
    const c = makeHighlight({
      id: 'c',
      text: 'no match here',
      notes: undefined,
      tags: undefined,
    });
    const results = searchHighlights([a, b, c], 'fox');
    expect(results.map((r) => r.highlight.id)).toEqual(['a', 'b']);
  });

  describe('field filtering', () => {
    it('text-only: matches on text, ignores notes/tags/url with same term', () => {
      const items = [
        makeHighlight({ id: 'text-match', text: 'contains keyword here' }),
        makeHighlight({
          id: 'notes-only',
          text: 'no match',
          notes: 'contains keyword here',
        }),
      ];
      const results = searchHighlights(items, 'keyword', ['text']);
      expect(results.map((r) => r.highlight.id)).toEqual(['text-match']);
      expect(results[0]?.matchedFields).toEqual(['text']);
    });

    it('notes-only: matches on notes, ignores text/tags/url', () => {
      const items = [
        makeHighlight({
          id: 'notes-match',
          text: 'no match',
          notes: 'contains keyword here',
        }),
        makeHighlight({
          id: 'text-only',
          text: 'contains keyword here',
          notes: 'no match',
        }),
      ];
      const results = searchHighlights(items, 'keyword', ['notes']);
      expect(results.map((r) => r.highlight.id)).toEqual(['notes-match']);
      expect(results[0]?.matchedFields).toEqual(['notes']);
    });

    it('tags-only: matches when any tag contains the query', () => {
      const items = [
        makeHighlight({
          id: 'tag-match',
          text: 'no match',
          tags: ['keyword-tag', 'other'],
        }),
        makeHighlight({
          id: 'text-only',
          text: 'contains keyword here',
          tags: ['unrelated'],
        }),
      ];
      const results = searchHighlights(items, 'keyword', ['tags']);
      expect(results.map((r) => r.highlight.id)).toEqual(['tag-match']);
      expect(results[0]?.matchedFields).toEqual(['tags']);
    });

    it('url-only: matches on url, ignores other fields', () => {
      const items = [
        makeHighlight({
          id: 'url-match',
          text: 'no match',
          url: 'https://keyword.com/page',
        }),
        makeHighlight({
          id: 'text-only',
          text: 'contains keyword here',
          url: 'https://other.com',
        }),
      ];
      const results = searchHighlights(items, 'keyword', ['url']);
      expect(results.map((r) => r.highlight.id)).toEqual(['url-match']);
      expect(results[0]?.matchedFields).toEqual(['url']);
    });

    it('all fields: matches across text, notes, tags, url, and domain', () => {
      const items = [
        makeHighlight({
          id: 'by-text',
          text: 'keyword here',
          notes: undefined,
          tags: undefined,
          url: 'https://a.com',
        }),
        makeHighlight({
          id: 'by-notes',
          text: 'no match',
          notes: 'keyword note',
          tags: undefined,
          url: 'https://a.com',
        }),
        makeHighlight({
          id: 'by-tags',
          text: 'no match',
          notes: undefined,
          tags: ['keyword'],
          url: 'https://a.com',
        }),
        makeHighlight({
          id: 'by-url',
          text: 'no match',
          notes: undefined,
          tags: undefined,
          url: 'https://keyword.com',
        }),
        makeHighlight({
          id: 'by-domain',
          text: 'no match',
          notes: undefined,
          tags: undefined,
          url: 'https://other.com/path',
          domain: 'keyword.example.com',
        }),
      ];
      const results = searchHighlights(items, 'keyword');
      expect(results.map((r) => r.highlight.id)).toEqual([
        'by-text',
        'by-notes',
        'by-tags',
        'by-url',
        'by-domain',
      ]);
    });
  });

  describe('matchedFields reporting', () => {
    it('reports a single matched field', () => {
      const items = [
        makeHighlight({
          text: 'unique-term-here',
          notes: 'no match',
          tags: ['no-match'],
          url: 'https://a.com',
        }),
      ];
      const results = searchHighlights(items, 'unique-term-here');
      expect(results[0]?.matchedFields).toEqual(['text']);
    });

    it('reports every matched field, not just the first', () => {
      const items = [
        makeHighlight({
          text: 'contains keyword',
          notes: 'also has keyword',
          tags: ['keyword-tag'],
          url: 'https://keyword.example.com',
        }),
      ];
      const results = searchHighlights(items, 'keyword');
      expect(results[0]?.matchedFields).toEqual([
        'text',
        'notes',
        'tags',
        'url',
        'domain',
      ]);
    });

    it('counts multiple matching tags as a single tags match', () => {
      const items = [
        makeHighlight({
          text: 'no match',
          notes: undefined,
          tags: ['keyword-one', 'keyword-two'],
          url: 'https://a.com',
        }),
      ];
      const results = searchHighlights(items, 'keyword');
      expect(results[0]?.matchedFields).toEqual(['tags']);
    });

    it('respects the requested fields subset when reporting matches', () => {
      const items = [
        makeHighlight({
          text: 'contains keyword',
          notes: 'also has keyword',
          tags: ['keyword-tag'],
          url: 'https://keyword.example.com',
        }),
      ];
      const results = searchHighlights(items, 'keyword', ['text', 'url']);
      expect(results[0]?.matchedFields).toEqual(['text', 'url']);
    });
  });

  it('does not throw for highlights missing notes/tags', () => {
    const items: SearchableHighlight[] = [
      { id: 'bare', text: 'a bare highlight with keyword', url: 'https://example.com' },
    ];
    expect(() => searchHighlights(items, 'keyword')).not.toThrow();
    const results = searchHighlights(items, 'keyword');
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedFields).toEqual(['text']);
  });
});

describe('formatMatchBadge', () => {
  it('returns null for empty or pure-text matches', () => {
    expect(formatMatchBadge([])).toBeNull();
    expect(formatMatchBadge(['text'])).toBeNull();
    expect(formatMatchBadge(['url'])).toBeNull();
  });

  it('labels notes and tags when the quote did not match', () => {
    expect(formatMatchBadge(['notes'])).toBe('Notes');
    expect(formatMatchBadge(['tags'])).toBe('Tags');
    expect(formatMatchBadge(['notes', 'tags'])).toBe('Notes · Tags');
  });

  it('includes Text when the quote matched along with notes/tags', () => {
    expect(formatMatchBadge(['text', 'tags'])).toBe('Text · Tags');
    expect(formatMatchBadge(['text', 'notes', 'tags'])).toBe('Text · Notes · Tags');
  });

  it('orders fields Text · Notes · Tags · Domain regardless of input order', () => {
    expect(formatMatchBadge(['tags', 'text', 'notes'])).toBe('Text · Notes · Tags');
    expect(formatMatchBadge(['domain', 'tags'])).toBe('Tags · Domain');
  });

  it('labels domain-only matches', () => {
    expect(formatMatchBadge(['domain'])).toBe('Domain');
  });
});
