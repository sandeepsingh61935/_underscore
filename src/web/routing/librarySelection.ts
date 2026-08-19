export type LibrarySelection = {
  domain: string | null;
  section: string | null;
  /** Open highlight detail when set. */
  highlight: string | null;
};

/**
 * Parse library selection from a URL search string (with or without leading `?`).
 */
export function parseLibrarySelection(search: string): LibrarySelection {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const domain = params.get('domain');
  const section = params.get('section');
  const highlight = params.get('highlight');
  return {
    domain: domain && domain.length > 0 ? domain : null,
    section: section && section.length > 0 ? section : null,
    highlight: highlight && highlight.length > 0 ? highlight : null,
  };
}

/**
 * Build a search string for library selection (no leading `?`) for navigate({ search }).
 * Returns empty string when nothing is set.
 */
export function buildLibrarySearch(sel: {
  domain?: string | null;
  section?: string | null;
  highlight?: string | null;
}): string {
  const params = new URLSearchParams();
  if (sel.domain) {
    params.set('domain', sel.domain);
  }
  if (sel.section) {
    params.set('section', sel.section);
  }
  if (sel.highlight) {
    params.set('highlight', sel.highlight);
  }
  return params.toString();
}
