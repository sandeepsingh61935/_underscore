import type { IDBPDatabase } from 'idb';

import {
  HIGHLIGHT_TAGS_STORE,
  HIGHLIGHTS_STORE,
  PAGE_GROUP_ITEMS_STORE,
  PAGE_GROUPS_STORE,
  TAGS_STORE,
} from '@/shared/constants/highlight-db-version';

/**
 * Shared IndexedDB upgrade for highlight + tag + page-group object stores.
 *
 * Every opener (highlight, tag, group repositories) runs this same helper,
 * so whichever repository opens the database first creates all stores.
 * The `contains` guards make each step idempotent across version jumps
 * (v1 -> v3 skips nothing, v2 -> v3 adds only the group stores).
 */
export function upgradeHighlightDatabase(db: IDBPDatabase): void {
  if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
    const store = db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'id' });
    store.createIndex('contentHash', 'contentHash');
    store.createIndex('url', 'url');
  }
  if (!db.objectStoreNames.contains(TAGS_STORE)) {
    const store = db.createObjectStore(TAGS_STORE, { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: true });
  }
  if (!db.objectStoreNames.contains(HIGHLIGHT_TAGS_STORE)) {
    const store = db.createObjectStore(HIGHLIGHT_TAGS_STORE, {
      keyPath: ['highlightId', 'tagId'],
    });
    store.createIndex('highlightId', 'highlightId');
    store.createIndex('tagId', 'tagId');
  }
  if (!db.objectStoreNames.contains(PAGE_GROUPS_STORE)) {
    const store = db.createObjectStore(PAGE_GROUPS_STORE, { keyPath: 'id' });
    store.createIndex('position', 'position');
  }
  if (!db.objectStoreNames.contains(PAGE_GROUP_ITEMS_STORE)) {
    const store = db.createObjectStore(PAGE_GROUP_ITEMS_STORE, { keyPath: 'id' });
    store.createIndex('groupId', 'groupId');
    store.createIndex('urlNormalized', 'urlNormalized');
    store.createIndex('hostname', 'hostname');
  }
}
