/**
 * @file highlight-filter.ts
 * @description Pure library search/filter model helpers: refine chips, tag
 * filters, and active-filter counting. Complements `highlight-search.ts`
 * (substring field matching). No React, no chrome.* APIs.
 */

import type { SearchField } from '@/shared/utils/highlight-search';
import { USER_SEARCH_FIELDS } from '@/shared/utils/highlight-search';

export type RefineFilter = 'has_notes' | 'needs_note' | 'has_tags' | 'untagged';

export const REFINE_OPTIONS: ReadonlyArray<{ id: RefineFilter; label: string }> = [
  { id: 'has_notes', label: 'With notes' },
  { id: 'needs_note', label: 'No notes' },
  { id: 'has_tags', label: 'With tags' },
  { id: 'untagged', label: 'No tags' },
] as const;

export const DEFAULT_SEARCH_FIELDS: SearchField[] = [...USER_SEARCH_FIELDS];

export interface FilterableHighlight {
  notes?: string;
  tags?: string[];
}

export interface LibraryFilterState {
  fields: SearchField[];
  refine: RefineFilter[];
  tagFilters: string[];
}

/** True when notes is a non-empty string after trim. */
export function highlightHasNotes(item: FilterableHighlight): boolean {
  return (item.notes ?? '').trim().length > 0;
}

/** True when at least one tag is present. */
export function highlightHasTags(item: FilterableHighlight): boolean {
  return (item.tags ?? []).length > 0;
}

/**
 * Whether fields differ from the default "All" scope (text + notes + tags + domain).
 * Counts as a single active filter unit in the Filters badge.
 */
export function fieldsAreRestricted(fields: SearchField[]): boolean {
  if (fields.length === 0) return false;
  const set = new Set(fields);
  return !USER_SEARCH_FIELDS.every((f) => set.has(f));
}

/**
 * Active filter count for the Filters control badge.
 * - Restricted field scope counts as 1
 * - Each refine chip counts as 1
 * - Each selected tag filter counts as 1
 */
export function countActiveFilters(state: LibraryFilterState): number {
  const fieldUnit = fieldsAreRestricted(state.fields) ? 1 : 0;
  return fieldUnit + state.refine.length + state.tagFilters.length;
}

export function isDefaultFilterState(state: LibraryFilterState): boolean {
  return countActiveFilters(state) === 0;
}

export function defaultLibraryFilterState(): LibraryFilterState {
  return {
    fields: [...DEFAULT_SEARCH_FIELDS],
    refine: [],
    tagFilters: [],
  };
}

/**
 * Match refine chips. Multiple refine ids are AND-combined.
 * Conflicting pairs (has_notes + needs_note, has_tags + untagged) match nothing.
 */
export function matchesRefine(
  item: FilterableHighlight,
  refine: RefineFilter[]
): boolean {
  if (refine.length === 0) return true;

  for (const id of refine) {
    switch (id) {
      case 'has_notes':
        if (!highlightHasNotes(item)) return false;
        break;
      case 'needs_note':
        if (highlightHasNotes(item)) return false;
        break;
      case 'has_tags':
        if (!highlightHasTags(item)) return false;
        break;
      case 'untagged':
        if (highlightHasTags(item)) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

/**
 * Tag filters: item must include every selected tag (case-insensitive AND).
 * Empty `tagFilters` matches all.
 */
export function matchesTagFilters(
  item: FilterableHighlight,
  tagFilters: string[]
): boolean {
  if (tagFilters.length === 0) return true;
  const tags = (item.tags ?? []).map((t) => t.toLowerCase());
  return tagFilters.every((wanted) => tags.includes(wanted.toLowerCase()));
}

/**
 * Apply refine + tag filters. Preserves input order.
 * Does not apply text query or field scope — callers combine with search.
 */
export function filterHighlightsByRefineAndTags<T extends FilterableHighlight>(
  items: T[],
  options: { refine?: RefineFilter[]; tagFilters?: string[] }
): T[] {
  const refine = options.refine ?? [];
  const tagFilters = options.tagFilters ?? [];
  if (refine.length === 0 && tagFilters.length === 0) return items;

  return items.filter(
    (item) => matchesRefine(item, refine) && matchesTagFilters(item, tagFilters)
  );
}

/** Toggle a refine chip; exclusive within a pair (has_notes/needs_note, has_tags/untagged). */
export function toggleRefine(current: RefineFilter[], id: RefineFilter): RefineFilter[] {
  if (current.includes(id)) {
    return current.filter((r) => r !== id);
  }
  const pair: Record<RefineFilter, RefineFilter | null> = {
    has_notes: 'needs_note',
    needs_note: 'has_notes',
    has_tags: 'untagged',
    untagged: 'has_tags',
  };
  const opposite = pair[id];
  const withoutOpposite = opposite ? current.filter((r) => r !== opposite) : current;
  return [...withoutOpposite, id];
}

/** Toggle a tag in the selected set (case-preserving of first selection). */
export function toggleTagFilter(current: string[], tag: string): string[] {
  const lower = tag.toLowerCase();
  if (current.some((t) => t.toLowerCase() === lower)) {
    return current.filter((t) => t.toLowerCase() !== lower);
  }
  return [...current, tag];
}

/**
 * Multi-select field toggle. Turning the last field off returns to All
 * (all user-facing fields). Turning a field on when currently "all" starts
 * a restricted set with only that field? No — multi-select: each field
 * independently on/off; empty → All.
 */
export function toggleSearchField(
  current: SearchField[],
  field: SearchField
): SearchField[] {
  const base = current.length === 0 ? [...USER_SEARCH_FIELDS] : [...current];
  const idx = base.indexOf(field);
  if (idx >= 0) {
    base.splice(idx, 1);
    return base.length === 0 ? [...USER_SEARCH_FIELDS] : base;
  }
  // Only user-facing fields in the UI set
  if (field === 'url') return base;
  return [...base, field];
}
