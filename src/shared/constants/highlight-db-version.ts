/**
 * Shared IndexedDB schema version for highlight + tag + page-group stores.
 * Bump when adding object stores (tags, highlight_tags added at v2;
 * page_groups, page_group_items added at v3).
 */
export const HIGHLIGHT_DB_VERSION = 3;

export const HIGHLIGHTS_STORE = 'highlights';
export const TAGS_STORE = 'tags';
export const HIGHLIGHT_TAGS_STORE = 'highlight_tags';
export const PAGE_GROUPS_STORE = 'page_groups';
export const PAGE_GROUP_ITEMS_STORE = 'page_group_items';
