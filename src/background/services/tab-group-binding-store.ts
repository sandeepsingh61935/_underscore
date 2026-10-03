/**
 * @file tab-group-binding-store.ts
 * @description Local persistent storage for tab group bindings (browser tab group <-> app group).
 * Stored in chrome.storage.local under the key 'tab_group_bindings'.
 */

import type { TabGroupBinding } from '@/shared/types/page-group';
import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('TabGroupBindingStore');

export const TAB_GROUP_BINDINGS_STORAGE_KEY = 'tab_group_bindings';

export interface StorageAreaLike {
  get(
    keys: string | string[]
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  set(items: Record<string, unknown>): Promise<void> | void;
  remove(keys: string | string[]): Promise<void> | void;
}

export interface ITabGroupBindingStore {
  getAll(): Promise<TabGroupBinding[]>;
  getByAppGroupId(appGroupId: string): Promise<TabGroupBinding | null>;
  getByBrowserGroupId(browserGroupId: number): Promise<TabGroupBinding | null>;
  save(binding: TabGroupBinding): Promise<void>;
  removeByAppGroupId(appGroupId: string): Promise<void>;
  removeByBrowserGroupId(browserGroupId: number): Promise<void>;
  clear(): Promise<void>;
}

export class TabGroupBindingStore implements ITabGroupBindingStore {
  private mutationQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly storage?: StorageAreaLike) {}

  private runSerialized<T>(op: () => Promise<T>): Promise<T> {
    const run = async () => {
      await this.mutationQueue;
      return op();
    };
    const result = run();
    this.mutationQueue = result.catch(() => {});
    return result;
  }

  private resolveStorage(): StorageAreaLike | null {
    if (this.storage) {
      return this.storage;
    }
    const g = globalThis as {
      chrome?: { storage?: { local?: StorageAreaLike } };
      browser?: { storage?: { local?: StorageAreaLike } };
    };
    if (g.chrome?.storage?.local) {
      return g.chrome.storage.local;
    }
    if (g.browser?.storage?.local) {
      return g.browser.storage.local;
    }
    return null;
  }

  async getAll(): Promise<TabGroupBinding[]> {
    try {
      const storage = this.resolveStorage();
      if (!storage) {
        return [];
      }
      const result = await storage.get(TAB_GROUP_BINDINGS_STORAGE_KEY);
      const data = result?.[TAB_GROUP_BINDINGS_STORAGE_KEY];
      if (!Array.isArray(data)) {
        return [];
      }
      return data as TabGroupBinding[];
    } catch (err) {
      logger.warn('Failed to get tab group bindings from storage', { err });
      return [];
    }
  }

  async getByAppGroupId(appGroupId: string): Promise<TabGroupBinding | null> {
    const all = await this.getAll();
    return all.find((b) => b.appGroupId === appGroupId) ?? null;
  }

  async getByBrowserGroupId(browserGroupId: number): Promise<TabGroupBinding | null> {
    const all = await this.getAll();
    return all.find((b) => b.browserGroupId === browserGroupId) ?? null;
  }

  async save(binding: TabGroupBinding): Promise<void> {
    return this.runSerialized(async () => {
      try {
        const storage = this.resolveStorage();
        if (!storage) {
          return;
        }
        const all = await this.getAll();
        const filtered = all.filter(
          (b) =>
            b.appGroupId !== binding.appGroupId &&
            b.browserGroupId !== binding.browserGroupId
        );
        filtered.push(binding);
        await storage.set({ [TAB_GROUP_BINDINGS_STORAGE_KEY]: filtered });
      } catch (err) {
        logger.warn('Failed to save tab group binding to storage', { err, binding });
      }
    });
  }

  async removeByAppGroupId(appGroupId: string): Promise<void> {
    return this.runSerialized(async () => {
      try {
        const storage = this.resolveStorage();
        if (!storage) {
          return;
        }
        const all = await this.getAll();
        const filtered = all.filter((b) => b.appGroupId !== appGroupId);
        if (filtered.length !== all.length) {
          await storage.set({ [TAB_GROUP_BINDINGS_STORAGE_KEY]: filtered });
        }
      } catch (err) {
        logger.warn('Failed to remove tab group binding by appGroupId', {
          err,
          appGroupId,
        });
      }
    });
  }

  async removeByBrowserGroupId(browserGroupId: number): Promise<void> {
    return this.runSerialized(async () => {
      try {
        const storage = this.resolveStorage();
        if (!storage) {
          return;
        }
        const all = await this.getAll();
        const filtered = all.filter((b) => b.browserGroupId !== browserGroupId);
        if (filtered.length !== all.length) {
          await storage.set({ [TAB_GROUP_BINDINGS_STORAGE_KEY]: filtered });
        }
      } catch (err) {
        logger.warn('Failed to remove tab group binding by browserGroupId', {
          err,
          browserGroupId,
        });
      }
    });
  }

  async clear(): Promise<void> {
    return this.runSerialized(async () => {
      try {
        const storage = this.resolveStorage();
        if (!storage) {
          return;
        }
        await storage.remove(TAB_GROUP_BINDINGS_STORAGE_KEY);
      } catch (err) {
        logger.warn('Failed to clear tab group bindings from storage', { err });
      }
    });
  }
}

export const tabGroupBindingStore = new TabGroupBindingStore();
