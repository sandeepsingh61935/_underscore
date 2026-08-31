/**
 * Per-origin web library cache (page origin IndexedDB).
 * Separate from the extension's IndexedDB — different browser storage partitions.
 */

import type { WebHighlight } from '@/web/lib/aggregateLibrary';

const DB_NAME = 'underscore_web_library';
const STORE = 'highlights';
const DB_VERSION = 1;

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
