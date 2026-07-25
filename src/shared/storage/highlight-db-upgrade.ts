import type { IDBPDatabase } from 'idb';

import {
  HIGHLIGHT_TAGS_STORE,
  HIGHLIGHTS_STORE,
  TAGS_STORE,
} from '@/shared/constants/highlight-db-version';

/** Shared IndexedDB upgrade for highlight + tag object stores. */
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
    const store = db.createObjectStore(HIGHLIGHT_TAGS_STORE, { keyPath: ['highlightId', 'tagId'] });
    store.createIndex('highlightId', 'highlightId');
    store.createIndex('tagId', 'tagId');
  }
}
