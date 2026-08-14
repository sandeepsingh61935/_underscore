/**
 * Web / quote-only page-context adapter for prepareHighlightExcerpts.
 * Empty excerpts forces quote fallback without an error note.
 */

import type { FetchPageContextFn } from './prepare-highlight-excerpts';

export const noopPageContextFetch: FetchPageContextFn = async () => ({
  success: true,
  data: {
    highlightExcerpts: [],
    cacheMissUrls: [],
  },
});
