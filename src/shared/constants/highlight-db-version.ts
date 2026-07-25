/**
 * Shared IndexedDB schema version for highlight + tag stores.
 * Bump when adding object stores (tags, highlight_tags added at v2).
 */
export const HIGHLIGHT_DB_VERSION = 2;

export const HIGHLIGHTS_STORE = 'highlights';
export const TAGS_STORE = 'tags';
export const HIGHLIGHT_TAGS_STORE = 'highlight_tags';
