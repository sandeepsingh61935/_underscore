/**
 * Parse library selection from a URL search string (with or without leading `?`).
 */
export function parseLibrarySelection(search: string): {
  domain: string | null;
  section: string | null;
} {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const domain = params.get('domain');
  const section = params.get('section');
  return {
    domain: domain && domain.length > 0 ? domain : null,
    section: section && section.length > 0 ? section : null,
  };
}

/**
 * Build a search string for library selection (no leading `?`) for navigate({ search }).
 * Returns empty string when neither domain nor section is set.
 */
export function buildLibrarySearch(sel: {
  domain?: string | null;
  section?: string | null;
}): string {
  const params = new URLSearchParams();
  if (sel.domain) {
    params.set('domain', sel.domain);
  }
  if (sel.section) {
    params.set('section', sel.section);
  }
  return params.toString();
}
