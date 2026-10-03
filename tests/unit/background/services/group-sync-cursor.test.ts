/**
 * @file group-sync-cursor.test.ts
 * @description Task 2.3: GroupSyncCursor persists a groups-only cursor under
 * its own storage key, independent of the highlight cursor.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GroupSyncCursor,
  LibrarySyncCursor,
} from '@/background/services/library-sync-cursor';

const store = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          const value = store.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (entries: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(entries)) {
            store.set(key, value);
          }
        }),
        remove: vi.fn(async (key: string) => {
          store.delete(key);
        }),
      },
    },
  },
}));

describe('GroupSyncCursor', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('returns null when nothing is stored', async () => {
    await expect(new GroupSyncCursor().get()).resolves.toBeNull();
  });

  it('round-trips set/get and clears independently of the highlight cursor', async () => {
    const groups = new GroupSyncCursor();
    const highlights = new LibrarySyncCursor();
    const stamp = new Date('2026-09-28T12:00:00.000Z');

    await highlights.set(new Date('2026-01-01T00:00:00.000Z'));
    await groups.set(stamp);

    await expect(groups.get()).resolves.toEqual(stamp);
    await expect(highlights.get()).resolves.toEqual(new Date('2026-01-01T00:00:00.000Z'));

    await groups.clear();
    await expect(groups.get()).resolves.toBeNull();
    // Highlight cursor survives the groups clear.
    await expect(highlights.get()).resolves.not.toBeNull();
  });

  it('returns null for unparseable values', async () => {
    store.set('underscore_groups_sync_cursor', 'not-a-date');

    await expect(new GroupSyncCursor().get()).resolves.toBeNull();
  });
});
