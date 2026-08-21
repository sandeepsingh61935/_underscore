/**
 * Shared library list sort — same keys as web LibraryPage.
 */

export type LibrarySortKey = 'newest' | 'oldest' | 'domain' | 'quote';

export const LIBRARY_SORT_LABELS: Record<LibrarySortKey, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  domain: 'Domain',
  quote: 'Quote',
};

export const LIBRARY_SORT_KEYS: LibrarySortKey[] = [
  'newest',
  'oldest',
  'domain',
  'quote',
];

export type LibrarySortableHighlight = {
  id: string;
  domain: string;
  text: string;
  /** Activity ms (updatedAt/createdAt/savedAt). */
  activityMs: number;
};

export function compareLibraryHighlights(
  a: LibrarySortableHighlight,
  b: LibrarySortableHighlight,
  sort: LibrarySortKey,
): number {
  switch (sort) {
    case 'oldest':
      return a.activityMs - b.activityMs || a.id.localeCompare(b.id);
    case 'domain':
      return (
        a.domain.localeCompare(b.domain) ||
        b.activityMs - a.activityMs ||
        a.id.localeCompare(b.id)
      );
    case 'quote':
      return (
        a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }) ||
        b.activityMs - a.activityMs ||
        a.id.localeCompare(b.id)
      );
    case 'newest':
    default:
      return b.activityMs - a.activityMs || a.id.localeCompare(b.id);
  }
}

export function sortLibraryHighlights<T extends LibrarySortableHighlight>(
  rows: readonly T[],
  sort: LibrarySortKey,
): T[] {
  return [...rows].sort((a, b) => compareLibraryHighlights(a, b, sort));
}
