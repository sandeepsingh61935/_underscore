/**
 * @file highlight-search.ts
 * @description Pure, framework-agnostic substring search over highlight-shaped
 * data. Extracted from the MCP bridge handler / cloud adapter haystack logic so
 * the matching semantics stay identical across the extension, web, and MCP
 * surfaces. No React, no chrome.* APIs — safe to import from any package.
 */

export type SearchField = 'text' | 'notes' | 'tags' | 'url' | 'domain';

export interface SearchableHighlight {
  id: string;
  text: string;
  url: string;
  /** Hostname when known — matched by the Domain field chip. */
  domain?: string;
  notes?: string;
  tags?: string[];
}

export interface HighlightSearchMatch<T> {
  highlight: T;
  matchedFields: SearchField[];
}

export const ALL_SEARCH_FIELDS: SearchField[] = ['text', 'notes', 'tags', 'url', 'domain'];

/**
 * User-facing field chips (Text / Notes / Tags / Domain).
 * Domain matches the collection hostname so users can find a site by name
 * without relying on quote text.
 */
export const USER_SEARCH_FIELDS: SearchField[] = ['text', 'notes', 'tags', 'domain'];

const MATCH_BADGE_FIELD_ORDER: ReadonlyArray<{ field: SearchField; label: string }> = [
  { field: 'text', label: 'Text' },
  { field: 'notes', label: 'Notes' },
  { field: 'tags', label: 'Tags' },
  { field: 'domain', label: 'Domain' },
];

/**
 * Compact mono match badge for library search hits (v3: "Text · Notes · Tags").
 * Omits pure quote-only hits (the quote is already visible) and internal `url` field.
 * Returns null when a badge would not help the reader.
 */
export function formatMatchBadge(matchedFields: readonly SearchField[]): string | null {
  if (matchedFields.length === 0) return null;

  const labels = MATCH_BADGE_FIELD_ORDER
    .filter(({ field }) => matchedFields.includes(field))
    .map(({ label }) => label);

  if (labels.length === 0) return null;
  // Quote already shows why a pure-text hit matched.
  if (labels.length === 1 && labels[0] === 'Text') return null;

  return labels.join(' · ');
}

/**
 * Case-insensitive substring search over a list of highlight-shaped items.
 *
 * - `fields` defaults to `ALL_SEARCH_FIELDS`.
 * - An empty `fields` array is treated as `USER_SEARCH_FIELDS` (the "All" chip
 *   scope). Callers may pass `[]` when the UI shows All active after every
 *   individual chip was toggled off; without this, an empty Set matches nothing.
 * - An empty/whitespace-only `query` returns `[]` — the caller decides what
 *   "no query" should render (e.g. the unfiltered list), this util only
 *   answers "what matches this query".
 * - `matchedFields` reports every requested field that matched (tags count as
 *   a single 'tags' match if any individual tag matches).
 * - Input order is preserved; no sorting or dedupe (callers pass one array of
 *   distinct highlights).
 */
export function searchHighlights<T extends SearchableHighlight>(
  items: T[],
  query: string,
  fields: SearchField[] = ALL_SEARCH_FIELDS,
): HighlightSearchMatch<T>[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const effectiveFields = fields.length === 0 ? USER_SEARCH_FIELDS : fields;
  const fieldSet = new Set(effectiveFields);
  const results: HighlightSearchMatch<T>[] = [];

  for (const item of items) {
    const matchedFields: SearchField[] = [];

    if (fieldSet.has('text') && item.text.toLowerCase().includes(trimmed)) {
      matchedFields.push('text');
    }
    if (fieldSet.has('notes') && (item.notes ?? '').toLowerCase().includes(trimmed)) {
      matchedFields.push('notes');
    }
    if (fieldSet.has('tags') && (item.tags ?? []).some((tag) => tag.toLowerCase().includes(trimmed))) {
      matchedFields.push('tags');
    }
    if (fieldSet.has('url') && item.url.toLowerCase().includes(trimmed)) {
      matchedFields.push('url');
    }
    if (fieldSet.has('domain')) {
      const host =
        (item.domain ?? '').toLowerCase() ||
        (() => {
          try {
            return new URL(item.url).hostname.toLowerCase();
          } catch {
            return '';
          }
        })();
      if (host && host.includes(trimmed)) {
        matchedFields.push('domain');
      }
    }

    if (matchedFields.length > 0) {
      results.push({ highlight: item, matchedFields });
    }
  }

  return results;
}
