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

export const ALL_SEARCH_FIELDS: SearchField[] = [
  'text',
  'notes',
  'tags',
  'url',
  'domain',
];

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

  const labels = MATCH_BADGE_FIELD_ORDER.filter(({ field }) =>
    matchedFields.includes(field)
  ).map(({ label }) => label);

  if (labels.length === 0) return null;
  // Quote already shows why a pure-text hit matched.
  if (labels.length === 1 && labels[0] === 'Text') return null;

  return labels.join(' · ');
}

interface PreprocessedHighlight {
  textLower: string;
  notesLower: string;
  tagsLower: string[];
  urlLower: string;
  domainLower: string;
}

const preprocessCache = new WeakMap<object, PreprocessedHighlight>();

/**
 * Fast-path domain/hostname extraction before falling back to new URL().
 * Avoids heavy C++ URL parser overhead for standard http(s) URLs.
 */
function extractDomain(url: string, explicitDomain?: string): string {
  if (explicitDomain && explicitDomain.trim()) {
    return explicitDomain.trim().toLowerCase();
  }
  if (!url) return '';

  let start = -1;
  if (url.startsWith('https://')) {
    start = 8;
  } else if (url.startsWith('http://')) {
    start = 7;
  } else if (url.startsWith('//')) {
    start = 2;
  }

  if (start !== -1) {
    let end = url.length;
    for (let i = start; i < url.length; i++) {
      const code = url.charCodeAt(i);
      // '/' (47), '?' (63), '#' (35)
      if (code === 47 || code === 63 || code === 35) {
        end = i;
        break;
      }
    }
    let host = url.slice(start, end);
    const atIndex = host.lastIndexOf('@');
    if (atIndex !== -1) {
      host = host.slice(atIndex + 1);
    }
    const colonIndex = host.indexOf(':');
    if (colonIndex !== -1) {
      host = host.slice(0, colonIndex);
    }
    if (host) {
      return host.toLowerCase();
    }
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function getPreprocessed(item: SearchableHighlight): PreprocessedHighlight {
  let cached = preprocessCache.get(item);
  if (!cached) {
    cached = {
      textLower: (item.text ?? '').toLowerCase(),
      notesLower: (item.notes ?? '').toLowerCase(),
      tagsLower: (item.tags ?? []).map((t) => t.toLowerCase()),
      urlLower: (item.url ?? '').toLowerCase(),
      domainLower: extractDomain(item.url, item.domain),
    };
    preprocessCache.set(item, cached);
  }
  return cached;
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
  fields: SearchField[] = ALL_SEARCH_FIELDS
): HighlightSearchMatch<T>[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const queryTokens = trimmed.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) {
    return [];
  }

  const effectiveFields = fields.length === 0 ? USER_SEARCH_FIELDS : fields;
  const fieldSet = new Set(effectiveFields);
  const checkText = fieldSet.has('text');
  const checkNotes = fieldSet.has('notes');
  const checkTags = fieldSet.has('tags');
  const checkUrl = fieldSet.has('url');
  const checkDomain = fieldSet.has('domain');

  const results: HighlightSearchMatch<T>[] = [];

  if (queryTokens.length === 1) {
    const token = queryTokens[0]!;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const pre = getPreprocessed(item);
      const matchedFields: SearchField[] = [];

      if (checkText && pre.textLower.includes(token)) {
        matchedFields.push('text');
      }
      if (checkNotes && pre.notesLower.includes(token)) {
        matchedFields.push('notes');
      }
      if (checkTags && pre.tagsLower.some((tag) => tag.includes(token))) {
        matchedFields.push('tags');
      }
      if (checkUrl && pre.urlLower.includes(token)) {
        matchedFields.push('url');
      }
      if (checkDomain && pre.domainLower && pre.domainLower.includes(token)) {
        matchedFields.push('domain');
      }

      if (matchedFields.length > 0) {
        results.push({ highlight: item, matchedFields });
      }
    }
    return results;
  }

  // Multi-word tokens: all tokens must match at least one of the active fields
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const pre = getPreprocessed(item);

    let allMatched = true;
    let matchedText = false;
    let matchedNotes = false;
    let matchedTags = false;
    let matchedUrl = false;
    let matchedDomain = false;

    for (let t = 0; t < queryTokens.length; t++) {
      const token = queryTokens[t]!;
      let tokenMatched = false;

      if (checkText && pre.textLower.includes(token)) {
        tokenMatched = true;
        matchedText = true;
      }
      if (checkNotes && pre.notesLower.includes(token)) {
        tokenMatched = true;
        matchedNotes = true;
      }
      if (checkTags && pre.tagsLower.some((tag) => tag.includes(token))) {
        tokenMatched = true;
        matchedTags = true;
      }
      if (checkUrl && pre.urlLower.includes(token)) {
        tokenMatched = true;
        matchedUrl = true;
      }
      if (checkDomain && pre.domainLower && pre.domainLower.includes(token)) {
        tokenMatched = true;
        matchedDomain = true;
      }

      if (!tokenMatched) {
        allMatched = false;
        break;
      }
    }

    if (allMatched) {
      const matchedFields: SearchField[] = [];
      if (matchedText) matchedFields.push('text');
      if (matchedNotes) matchedFields.push('notes');
      if (matchedTags) matchedFields.push('tags');
      if (matchedUrl) matchedFields.push('url');
      if (matchedDomain) matchedFields.push('domain');
      results.push({ highlight: item, matchedFields });
    }
  }

  return results;
}
