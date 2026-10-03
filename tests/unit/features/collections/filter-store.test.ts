import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterStore,
  clearFilterStore,
  FilterStateSchema,
  DEFAULT_FILTER_STATE,
  parseFilterState,
} from '@/features/collections/stores/filter.store';

describe('Filter store (Zod-validated state management)', () => {
  beforeEach(() => {
    clearFilterStore();
  });

  it('initializes with default filter state validated by Zod schema', () => {
    const state = filterStore.getState();
    expect(state).toEqual(DEFAULT_FILTER_STATE);
    expect(FilterStateSchema.safeParse(state).success).toBe(true);
  });

  it('safely parses valid and invalid filter states with Zod', () => {
    const valid = {
      query: 'search test',
      fields: ['text', 'tags'],
      refine: ['has_notes'],
      tagFilters: ['react', 'testing'],
    };
    expect(parseFilterState(valid)).toEqual(valid);

    // Invalid fields / corrupt data should fall back to default
    const invalid = {
      query: 123,
      fields: ['invalid_field'],
      refine: ['bogus'],
    };
    expect(parseFilterState(invalid)).toEqual(DEFAULT_FILTER_STATE);
  });

  it('updates query and notifies subscribers', () => {
    let notified = false;
    const unsubscribe = filterStore.subscribe(() => {
      notified = true;
    });

    filterStore.setQuery('typescript');
    expect(filterStore.getState().query).toBe('typescript');
    expect(notified).toBe(true);

    unsubscribe();
  });

  it('updates refine and tag filters, carrying them forward', () => {
    filterStore.toggleRefine('has_notes');
    filterStore.toggleTagFilter('design');

    expect(filterStore.getState().refine).toEqual(['has_notes']);
    expect(filterStore.getState().tagFilters).toEqual(['design']);

    // Toggling conflicting refine pair drops the opposite
    filterStore.toggleRefine('needs_note');
    expect(filterStore.getState().refine).toEqual(['needs_note']);

    // Toggling same tag removes it
    filterStore.toggleTagFilter('design');
    expect(filterStore.getState().tagFilters).toEqual([]);
  });

  it('toggles search fields and handles reset', () => {
    filterStore.toggleSearchField('domain');
    expect(filterStore.getState().fields).not.toContain('domain');

    filterStore.resetFilters();
    expect(filterStore.getState().fields).toEqual(DEFAULT_FILTER_STATE.fields);
    expect(filterStore.getState().refine).toEqual([]);
    expect(filterStore.getState().tagFilters).toEqual([]);
  });

  it('persists and restores state from localStorage with Zod validation', () => {
    filterStore.setQuery('persistent-test');
    filterStore.setTagFilters(['important']);

    // A fresh read through parseFilterState verifies persistence
    const raw = window.localStorage.getItem('underscore_library_filter_state');
    expect(raw).toBeTruthy();
    const parsed = parseFilterState(JSON.parse(raw!));
    expect(parsed.query).toBe('persistent-test');
    expect(parsed.tagFilters).toEqual(['important']);
  });
});
