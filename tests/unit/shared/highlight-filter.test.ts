import { describe, expect, it } from 'vitest';

import {
  countActiveFilters,
  defaultLibraryFilterState,
  fieldsAreRestricted,
  filterHighlightsByRefineAndTags,
  isDefaultFilterState,
  matchesGroupUrl,
  matchesRefine,
  matchesTagFilters,
  toggleGroupFilter,
  toggleRefine,
  toggleSearchField,
  toggleTagFilter,
  type FilterableHighlight,
} from '@/shared/utils/highlight-filter';

function item(overrides: Partial<FilterableHighlight> = {}): FilterableHighlight {
  return {
    notes: 'a note',
    tags: ['css', 'cascade'],
    ...overrides,
  };
}

describe('highlight-filter model', () => {
  describe('countActiveFilters / defaults', () => {
    it('counts zero for default all-fields empty refine/tags', () => {
      expect(countActiveFilters(defaultLibraryFilterState())).toBe(0);
      expect(isDefaultFilterState(defaultLibraryFilterState())).toBe(true);
    });

    it('counts restricted fields as one unit', () => {
      expect(countActiveFilters({ fields: ['text'], refine: [], tagFilters: [] })).toBe(
        1
      );
      expect(fieldsAreRestricted(['text', 'notes', 'tags', 'domain'])).toBe(false);
      expect(fieldsAreRestricted(['text', 'notes', 'tags'])).toBe(true);
      expect(fieldsAreRestricted(['text', 'notes'])).toBe(true);
    });

    it('sums refine chips and tag filters', () => {
      expect(
        countActiveFilters({
          fields: ['text'],
          refine: ['has_notes', 'has_tags'],
          tagFilters: ['css', 'rag'],
        })
      ).toBe(1 + 2 + 2);
    });

    it('treats empty fields array as unrestricted (All)', () => {
      expect(fieldsAreRestricted([])).toBe(false);
      expect(countActiveFilters({ fields: [], refine: [], tagFilters: [] })).toBe(0);
    });
  });

  describe('matchesRefine', () => {
    it('matches has_notes / needs_note', () => {
      expect(matchesRefine(item({ notes: 'x' }), ['has_notes'])).toBe(true);
      expect(matchesRefine(item({ notes: '  ' }), ['has_notes'])).toBe(false);
      expect(matchesRefine(item({ notes: '' }), ['needs_note'])).toBe(true);
      expect(matchesRefine(item({ notes: 'x' }), ['needs_note'])).toBe(false);
    });

    it('matches has_tags / untagged', () => {
      expect(matchesRefine(item({ tags: ['a'] }), ['has_tags'])).toBe(true);
      expect(matchesRefine(item({ tags: [] }), ['has_tags'])).toBe(false);
      expect(matchesRefine(item({ tags: [] }), ['untagged'])).toBe(true);
      expect(matchesRefine(item({ tags: ['a'] }), ['untagged'])).toBe(false);
    });

    it('ANDs multiple refine ids', () => {
      expect(
        matchesRefine(item({ notes: 'n', tags: [] }), ['has_notes', 'untagged'])
      ).toBe(true);
      expect(
        matchesRefine(item({ notes: 'n', tags: ['a'] }), ['has_notes', 'untagged'])
      ).toBe(false);
    });

    it('conflicting pair matches nothing', () => {
      expect(matchesRefine(item(), ['has_notes', 'needs_note'])).toBe(false);
    });
  });

  describe('matchesTagFilters', () => {
    it('requires every selected tag (AND, case-insensitive)', () => {
      expect(matchesTagFilters(item({ tags: ['css', 'cascade'] }), ['css'])).toBe(true);
      expect(
        matchesTagFilters(item({ tags: ['css', 'cascade'] }), ['CSS', 'Cascade'])
      ).toBe(true);
      expect(matchesTagFilters(item({ tags: ['css'] }), ['css', 'rag'])).toBe(false);
    });

    it('empty tagFilters matches all', () => {
      expect(matchesTagFilters(item({ tags: [] }), [])).toBe(true);
    });
  });

  describe('filterHighlightsByRefineAndTags', () => {
    it('preserves order and applies both dimensions', () => {
      const a = item({ notes: 'n', tags: ['css'] });
      const b = item({ notes: '', tags: ['css'] });
      const c = item({ notes: 'n', tags: ['other'] });
      const out = filterHighlightsByRefineAndTags([a, b, c], {
        refine: ['has_notes'],
        tagFilters: ['css'],
      });
      expect(out).toEqual([a]);
    });

    it('returns input when no refine/tags', () => {
      const items = [item()];
      expect(filterHighlightsByRefineAndTags(items, {})).toBe(items);
    });
  });

  describe('toggle helpers', () => {
    it('toggleRefine drops the opposite of a pair', () => {
      expect(toggleRefine(['has_notes'], 'needs_note')).toEqual(['needs_note']);
      expect(toggleRefine(['needs_note'], 'needs_note')).toEqual([]);
      expect(toggleRefine(['has_tags'], 'untagged')).toEqual(['untagged']);
    });

    it('toggleTagFilter is case-insensitive for membership', () => {
      expect(toggleTagFilter(['css'], 'CSS')).toEqual([]);
      expect(toggleTagFilter([], 'css')).toEqual(['css']);
    });

    it('toggleSearchField multi-selects and empty returns All', () => {
      expect(toggleSearchField(['text', 'notes', 'tags', 'domain'], 'notes')).toEqual([
        'text',
        'tags',
        'domain',
      ]);
      expect(toggleSearchField(['text'], 'text')).toEqual([
        'text',
        'notes',
        'tags',
        'domain',
      ]);
      expect(toggleSearchField(['text'], 'notes')).toEqual(['text', 'notes']);
    });

    it('toggleGroupFilter adds and removes group ids exactly', () => {
      expect(toggleGroupFilter([], 'g1')).toEqual(['g1']);
      expect(toggleGroupFilter(['g1'], 'g1')).toEqual([]);
      expect(toggleGroupFilter(['g1'], 'g2')).toEqual(['g1', 'g2']);
    });
  });

  describe('group filter', () => {
    it('defaults to no group filters and counts each selected group', () => {
      expect(defaultLibraryFilterState().groupFilters).toEqual([]);
      expect(
        countActiveFilters({
          fields: ['text', 'notes', 'tags', 'domain'],
          refine: [],
          tagFilters: [],
          groupFilters: ['g1', 'g2'],
        })
      ).toBe(2);
    });

    it('matchesGroupUrl passes everything when no set is given', () => {
      expect(matchesGroupUrl(item({ url: 'https://a.com/' }), null)).toBe(true);
      expect(matchesGroupUrl(item({ url: 'https://a.com/' }), undefined)).toBe(true);
    });

    it('matchesGroupUrl checks normalized membership', () => {
      const set = new Set(['https://a.com/docs']);
      expect(matchesGroupUrl(item({ url: 'https://a.com/docs#frag' }), set)).toBe(true);
      expect(matchesGroupUrl(item({ url: 'https://b.com/' }), set)).toBe(false);
      expect(matchesGroupUrl(item({ url: 'https://a.com/docs' }), new Set())).toBe(
        false
      );
      expect(matchesGroupUrl(item(), set)).toBe(false);
    });

    it('filterHighlightsByRefineAndTags ANDs the group set with refine/tags', () => {
      const set = new Set(['https://a.com/']);
      const a = item({ url: 'https://a.com/', notes: 'n', tags: ['css'] });
      const b = item({ url: 'https://b.com/', notes: 'n', tags: ['css'] });
      const c = item({ url: 'https://a.com/', notes: '', tags: ['css'] });
      const out = filterHighlightsByRefineAndTags([a, b, c], {
        refine: ['has_notes'],
        tagFilters: ['css'],
        groupUrlSet: set,
      });
      expect(out).toEqual([a]);
    });
  });
});
