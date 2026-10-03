/**
 * @file filter.store.ts
 * @description Zod-validated state management store for Library and Collections filters.
 * Manages query, search fields, refine chips, and tag filters with schema validation,
 * persistence across views and page navigation, and React synchronization.
 */

import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import {
  countActiveFilters,
  DEFAULT_SEARCH_FIELDS,
  toggleRefine as toggleRefineUtil,
  toggleSearchField as toggleSearchFieldUtil,
  toggleTagFilter as toggleTagFilterUtil,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import type { SearchField } from '@/shared/utils/highlight-search';

export const SearchFieldSchema = z.enum([
  'text',
  'notes',
  'tags',
  'url',
  'domain',
]);

export const RefineFilterSchema = z.enum([
  'has_notes',
  'needs_note',
  'has_tags',
  'untagged',
]);

export const FilterStateSchema = z.object({
  query: z.string().default(''),
  fields: z.array(SearchFieldSchema).default(() => [...DEFAULT_SEARCH_FIELDS]),
  refine: z.array(RefineFilterSchema).default([]),
  tagFilters: z.array(z.string()).default([]),
});

export type FilterState = z.infer<typeof FilterStateSchema>;

export const DEFAULT_FILTER_STATE: FilterState = {
  query: '',
  fields: [...DEFAULT_SEARCH_FIELDS],
  refine: [],
  tagFilters: [],
};

export const FILTER_STORAGE_KEY = 'underscore_library_filter_state';

/**
 * Safely parse any input data against the Zod schema with fallback to default state.
 */
export function parseFilterState(data: unknown): FilterState {
  const result = FilterStateSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return {
    query: DEFAULT_FILTER_STATE.query,
    fields: [...DEFAULT_FILTER_STATE.fields],
    refine: [...DEFAULT_FILTER_STATE.refine],
    tagFilters: [...DEFAULT_FILTER_STATE.tagFilters],
  };
}

function loadPersistedFilterState(): FilterState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parseFilterState(parsed);
      }
    }
  } catch {
    // Ignore storage parse errors and fallback
  }
  return {
    query: DEFAULT_FILTER_STATE.query,
    fields: [...DEFAULT_FILTER_STATE.fields],
    refine: [...DEFAULT_FILTER_STATE.refine],
    tagFilters: [...DEFAULT_FILTER_STATE.tagFilters],
  };
}

function persistFilterState(state: FilterState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const validated = FilterStateSchema.parse(state);
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(validated));
    }
  } catch {
    // Ignore storage write errors
  }
}

let currentState: FilterState = loadPersistedFilterState();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export const filterStore = {
  getState(): FilterState {
    return currentState;
  },

  setState(
    updater: Partial<FilterState> | ((prev: FilterState) => Partial<FilterState>)
  ): void {
    const patch = typeof updater === 'function' ? updater(currentState) : updater;
    const validated = FilterStateSchema.parse({
      ...currentState,
      ...patch,
    });

    if (
      currentState.query === validated.query &&
      currentState.fields.length === validated.fields.length &&
      currentState.fields.every((f, i) => f === validated.fields[i]) &&
      currentState.refine.length === validated.refine.length &&
      currentState.refine.every((r, i) => r === validated.refine[i]) &&
      currentState.tagFilters.length === validated.tagFilters.length &&
      currentState.tagFilters.every((t, i) => t === validated.tagFilters[i])
    ) {
      return;
    }

    currentState = validated;
    persistFilterState(currentState);
    notify();
  },

  setQuery(query: string): void {
    filterStore.setState({ query });
  },

  setFields(fields: SearchField[]): void {
    filterStore.setState({ fields });
  },

  setRefine(refine: RefineFilter[]): void {
    filterStore.setState({ refine });
  },

  setTagFilters(tagFilters: string[]): void {
    filterStore.setState({ tagFilters });
  },

  toggleRefine(id: RefineFilter): void {
    filterStore.setState((prev) => ({
      refine: toggleRefineUtil(prev.refine, id),
    }));
  },

  toggleTagFilter(tag: string): void {
    filterStore.setState((prev) => ({
      tagFilters: toggleTagFilterUtil(prev.tagFilters, tag),
    }));
  },

  toggleSearchField(field: SearchField): void {
    filterStore.setState((prev) => ({
      fields: toggleSearchFieldUtil(prev.fields, field),
    }));
  },

  resetFilters(): void {
    filterStore.setState({
      fields: [...DEFAULT_SEARCH_FIELDS],
      refine: [],
      tagFilters: [],
    });
  },

  resetAll(): void {
    filterStore.setState({
      query: '',
      fields: [...DEFAULT_SEARCH_FIELDS],
      refine: [],
      tagFilters: [],
    });
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function clearFilterStore(): void {
  currentState = {
    query: DEFAULT_FILTER_STATE.query,
    fields: [...DEFAULT_FILTER_STATE.fields],
    refine: [...DEFAULT_FILTER_STATE.refine],
    tagFilters: [...DEFAULT_FILTER_STATE.tagFilters],
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(FILTER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
  notify();
}

export function useFilterStore() {
  const state = useSyncExternalStore(
    filterStore.subscribe,
    filterStore.getState,
    () => DEFAULT_FILTER_STATE
  );

  const activeFilterCount = countActiveFilters(state);
  const hasActiveFilters = state.query.trim().length > 0 || activeFilterCount > 0;

  return {
    ...state,
    setQuery: filterStore.setQuery,
    setFields: filterStore.setFields,
    setRefine: filterStore.setRefine,
    setTagFilters: filterStore.setTagFilters,
    toggleRefine: filterStore.toggleRefine,
    toggleTagFilter: filterStore.toggleTagFilter,
    toggleSearchField: filterStore.toggleSearchField,
    resetFilters: filterStore.resetFilters,
    resetAll: filterStore.resetAll,
    hasActiveFilters,
    activeFilterCount,
  };
}
