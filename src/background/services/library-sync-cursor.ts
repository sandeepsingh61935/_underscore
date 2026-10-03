/**
 * @file library-sync-cursor.ts
 * @description Tracks last successful cloud library sync timestamp.
 */

import { browser } from 'wxt/browser';

const STORAGE_KEY = 'underscore_library_sync_cursor';

export class LibrarySyncCursor {
  async get(): Promise<Date | null> {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];

    if (typeof value !== 'string' || !value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async set(timestamp: Date): Promise<void> {
    await browser.storage.local.set({
      [STORAGE_KEY]: timestamp.toISOString(),
    });
  }

  async clear(): Promise<void> {
    await browser.storage.local.remove(STORAGE_KEY);
  }
}

const GROUPS_STORAGE_KEY = 'underscore_groups_sync_cursor';

/**
 * Separate incremental-pull cursor for Page Groups (plan Phase 2 Task 2.3).
 * Highlights and groups advance independently so a groups-only change never
 * forces a full highlight re-pull (and vice versa). Cleared on sign-out
 * alongside the highlight cursor.
 */
export class GroupSyncCursor {
  async get(): Promise<Date | null> {
    const stored = await browser.storage.local.get(GROUPS_STORAGE_KEY);
    const value = stored[GROUPS_STORAGE_KEY];

    if (typeof value !== 'string' || !value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async set(timestamp: Date): Promise<void> {
    await browser.storage.local.set({
      [GROUPS_STORAGE_KEY]: timestamp.toISOString(),
    });
  }

  async clear(): Promise<void> {
    await browser.storage.local.remove(GROUPS_STORAGE_KEY);
  }
}
