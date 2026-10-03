/**
 * Per-origin web library cache (page origin IndexedDB).
 * Separate from the extension's IndexedDB — different browser storage partitions.
 */

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

const DB_NAME = 'underscore_web_library';
const STORE = 'highlights';
const GROUPS_STORE = 'groups';
const DB_VERSION = 2;

export type WebLibraryCacheRecord = {
  userId: string;
  highlights: WebHighlight[];
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains(GROUPS_STORE)) {
        db.createObjectStore(GROUPS_STORE, { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function writeWebLibraryCache(
  userId: string,
  highlights: WebHighlight[]
): Promise<void> {
  if (typeof indexedDB === 'undefined' || !userId) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      userId,
      highlights,
      savedAt: Date.now(),
    } satisfies WebLibraryCacheRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readWebLibraryCache(
  userId: string
): Promise<WebLibraryCacheRecord | null> {
  if (typeof indexedDB === 'undefined' || !userId) return null;
  const db = await openDb();
  const record = await new Promise<WebLibraryCacheRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(userId);
    req.onsuccess = () =>
      resolve((req.result as WebLibraryCacheRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

/** Groups snapshot for warm paint + Realtime merge base (Phase 2 Task 2.5). */
export type WebGroupsCacheRecord = {
  userId: string;
  groups: PageGroup[];
  itemsByGroup: Record<string, PageGroupItem[]>;
  savedAt: number;
};

export async function writeWebGroupsCache(
  userId: string,
  groups: PageGroup[],
  itemsByGroup: Record<string, PageGroupItem[]>
): Promise<void> {
  if (typeof indexedDB === 'undefined' || !userId) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GROUPS_STORE, 'readwrite');
    tx.objectStore(GROUPS_STORE).put({
      userId,
      groups,
      itemsByGroup,
      savedAt: Date.now(),
    } satisfies WebGroupsCacheRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readWebGroupsCache(
  userId: string
): Promise<WebGroupsCacheRecord | null> {
  if (typeof indexedDB === 'undefined' || !userId) return null;
  const db = await openDb();
  const record = await new Promise<WebGroupsCacheRecord | null>((resolve, reject) => {
    const tx = db.transaction(GROUPS_STORE, 'readonly');
    const req = tx.objectStore(GROUPS_STORE).get(userId);
    req.onsuccess = () =>
      resolve((req.result as WebGroupsCacheRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}
