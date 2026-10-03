/**
 * @file tab-group-binding-store.test.ts
 * @description Unit tests for TabGroupBindingStore.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TAB_GROUP_BINDINGS_STORAGE_KEY,
  TabGroupBindingStore,
} from '@/background/services/tab-group-binding-store';
import type { TabGroupBinding } from '@/shared/types/page-group';

describe('TabGroupBindingStore', () => {
  const store = new Map<string, unknown>();

  const mockStorage = {
    get: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const k of keyList) {
        if (store.has(k)) {
          result[k] = store.get(k);
        }
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) {
        store.set(k, v);
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        store.delete(k);
      }
    }),
  };

  const sampleBinding1: TabGroupBinding = {
    appGroupId: 'app-group-1',
    browserGroupId: 10,
    windowId: 1,
    title: 'Work',
    color: 'blue',
    urls: ['https://example.com/1', 'https://example.com/2'],
    lastSeenAt: '2026-09-28T10:00:00.000Z',
  };

  const sampleBinding2: TabGroupBinding = {
    appGroupId: 'app-group-2',
    browserGroupId: 20,
    windowId: 1,
    title: 'Personal',
    color: 'green',
    urls: ['https://personal.com'],
    lastSeenAt: '2026-09-28T11:00:00.000Z',
  };

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe('with mockStorage injection', () => {
    it('returns empty array when nothing is stored', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      const all = await bindingStore.getAll();
      expect(all).toEqual([]);
    });

    it('saves a binding and retrieves it via getAll', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);

      const all = await bindingStore.getAll();
      expect(all).toEqual([sampleBinding1]);
      expect(store.get(TAB_GROUP_BINDINGS_STORAGE_KEY)).toEqual([sampleBinding1]);
    });

    it('retrieves binding by appGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      await bindingStore.save(sampleBinding2);

      const found = await bindingStore.getByAppGroupId('app-group-1');
      expect(found).toEqual(sampleBinding1);

      const missing = await bindingStore.getByAppGroupId('non-existent');
      expect(missing).toBeNull();
    });

    it('retrieves binding by browserGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      await bindingStore.save(sampleBinding2);

      const found = await bindingStore.getByBrowserGroupId(20);
      expect(found).toEqual(sampleBinding2);

      const missing = await bindingStore.getByBrowserGroupId(999);
      expect(missing).toBeNull();
    });

    it('upserts: updates binding when saved with same appGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);

      const updatedBinding: TabGroupBinding = {
        ...sampleBinding1,
        title: 'Updated Work Title',
        urls: ['https://example.com/updated'],
      };
      await bindingStore.save(updatedBinding);

      const all = await bindingStore.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(updatedBinding);
    });

    it('ensures unique browserGroupId by evicting prior binding with same browserGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1); // browserGroupId: 10, appGroupId: app-group-1

      // New binding with different appGroupId but SAME browserGroupId (10)
      const competingBinding: TabGroupBinding = {
        appGroupId: 'app-group-3',
        browserGroupId: 10,
        windowId: 1,
        title: 'New Claimer',
        color: 'yellow',
        urls: ['https://new.com'],
        lastSeenAt: '2026-09-28T12:00:00.000Z',
      };
      await bindingStore.save(competingBinding);

      const all = await bindingStore.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]?.appGroupId).toBe('app-group-3');
      expect(all[0]?.browserGroupId).toBe(10);

      // Old binding app-group-1 should no longer be present
      expect(await bindingStore.getByAppGroupId('app-group-1')).toBeNull();
    });

    it('removes binding by appGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      await bindingStore.save(sampleBinding2);

      await bindingStore.removeByAppGroupId('app-group-1');

      const all = await bindingStore.getAll();
      expect(all).toEqual([sampleBinding2]);
    });

    it('removes binding by browserGroupId', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      await bindingStore.save(sampleBinding2);

      await bindingStore.removeByBrowserGroupId(20);

      const all = await bindingStore.getAll();
      expect(all).toEqual([sampleBinding1]);
    });

    it('clears all bindings from storage', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      await bindingStore.save(sampleBinding2);

      await bindingStore.clear();

      expect(await bindingStore.getAll()).toEqual([]);
      expect(store.has(TAB_GROUP_BINDINGS_STORAGE_KEY)).toBe(false);
    });

    it('does not invoke storage.set when remove finds no matching item', async () => {
      const bindingStore = new TabGroupBindingStore(mockStorage);
      await bindingStore.save(sampleBinding1);
      mockStorage.set.mockClear();

      await bindingStore.removeByAppGroupId('non-existent');
      expect(mockStorage.set).not.toHaveBeenCalled();

      await bindingStore.removeByBrowserGroupId(9999);
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('serializes concurrent save calls to prevent lost updates', async () => {
      const delayedStorage = {
        get: vi.fn(async (keys: string | string[]) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const keyList = Array.isArray(keys) ? keys : [keys];
          const result: Record<string, unknown> = {};
          for (const k of keyList) {
            if (store.has(k)) {
              result[k] = store.get(k);
            }
          }
          return result;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          for (const [k, v] of Object.entries(items)) {
            store.set(k, v);
          }
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            store.delete(k);
          }
        }),
      };

      const bindingStore = new TabGroupBindingStore(delayedStorage);

      await Promise.all([
        bindingStore.save(sampleBinding1),
        bindingStore.save(sampleBinding2),
      ]);

      const all = await bindingStore.getAll();
      expect(all).toHaveLength(2);
      const ids = all.map((b) => b.appGroupId).sort();
      expect(ids).toEqual(['app-group-1', 'app-group-2']);
    });
  });

  describe('global storage fallback and error handling', () => {
    it('uses chrome.storage.local from globalThis if no storage is injected', async () => {
      vi.stubGlobal('chrome', {
        storage: {
          local: mockStorage,
        },
      });

      const bindingStore = new TabGroupBindingStore();
      await bindingStore.save(sampleBinding1);

      expect(mockStorage.set).toHaveBeenCalled();
      expect(await bindingStore.getAll()).toEqual([sampleBinding1]);

      vi.unstubAllGlobals();
    });

    it('safely returns defaults when storage is completely missing', async () => {
      vi.stubGlobal('chrome', undefined);
      vi.stubGlobal('browser', undefined);

      const bindingStore = new TabGroupBindingStore();

      await expect(bindingStore.getAll()).resolves.toEqual([]);
      await expect(bindingStore.getByAppGroupId('any')).resolves.toBeNull();
      await expect(bindingStore.getByBrowserGroupId(123)).resolves.toBeNull();
      await expect(bindingStore.save(sampleBinding1)).resolves.toBeUndefined();
      await expect(bindingStore.removeByAppGroupId('any')).resolves.toBeUndefined();
      await expect(bindingStore.removeByBrowserGroupId(123)).resolves.toBeUndefined();
      await expect(bindingStore.clear()).resolves.toBeUndefined();

      vi.unstubAllGlobals();
    });

    it('safely handles storage exceptions without throwing', async () => {
      const throwingStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage read error')),
        set: vi.fn().mockRejectedValue(new Error('Storage quota exceeded')),
        remove: vi.fn().mockRejectedValue(new Error('Storage delete error')),
      };

      const bindingStore = new TabGroupBindingStore(throwingStorage);

      await expect(bindingStore.getAll()).resolves.toEqual([]);
      await expect(bindingStore.getByAppGroupId('any')).resolves.toBeNull();
      await expect(bindingStore.getByBrowserGroupId(123)).resolves.toBeNull();
      await expect(bindingStore.save(sampleBinding1)).resolves.toBeUndefined();
      await expect(bindingStore.removeByAppGroupId('any')).resolves.toBeUndefined();
      await expect(bindingStore.removeByBrowserGroupId(123)).resolves.toBeUndefined();
      await expect(bindingStore.clear()).resolves.toBeUndefined();
    });
  });
});
