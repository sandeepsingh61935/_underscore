/**
 * Per-domain compressed favicon cache (local IndexedDB).
 * Not per-highlight — one row per host, capped by compress-favicon.
 */

import { openDB, type IDBPDatabase } from 'idb';

import type { CompressedFavicon } from './compress-favicon';

const DB_NAME = 'underscore-domain-favicons';
const DB_VERSION = 1;
const STORE = 'favicons';

export type StoredDomainFavicon = CompressedFavicon & {
  domain: string;
  updatedAt: number;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function ensureDatabase(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'domain' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getDomainFavicon(
  domain: string
): Promise<StoredDomainFavicon | null> {
  const key = domain.trim().toLowerCase();
  if (!key) return null;
  try {
    const db = await ensureDatabase();
    const row = await db.get(STORE, key);
    return (row as StoredDomainFavicon | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function putDomainFavicon(
  domain: string,
  icon: CompressedFavicon
): Promise<void> {
  const key = domain.trim().toLowerCase();
  if (!key) return;
  const db = await ensureDatabase();
  const row: StoredDomainFavicon = {
    domain: key,
    mime: icon.mime,
    bytes: icon.bytes,
    updatedAt: Date.now(),
  };
  await db.put(STORE, row);
}
