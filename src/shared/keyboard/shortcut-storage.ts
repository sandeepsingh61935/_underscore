import type { Chord } from './shortcut-chord';
import { ShortcutOverridesSchema } from './shortcut-chord';

export const SHORTCUT_OVERRIDES_STORAGE_KEY = 'shortcut_overrides';

export interface IShortcutStorage {
  getOverrides(): Promise<Record<string, Chord>>;
  setOverride(id: string, chord: Chord): Promise<void>;
  resetOverride(id: string): Promise<void>;
  resetAll(): Promise<void>;
  onChange(callback: (overrides: Record<string, Chord>) => void): () => void;
}

export function parseOverridesSafe(raw: unknown): Record<string, Chord> {
  if (!raw || typeof raw !== 'object') return {};
  const parsed = ShortcutOverridesSchema.safeParse(raw);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

export class ChromeShortcutStorage implements IShortcutStorage {
  async getOverrides(): Promise<Record<string, Chord>> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(SHORTCUT_OVERRIDES_STORAGE_KEY);
      return parseOverridesSafe(data[SHORTCUT_OVERRIDES_STORAGE_KEY]);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(SHORTCUT_OVERRIDES_STORAGE_KEY);
        return item ? parseOverridesSafe(JSON.parse(item)) : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  async setOverride(id: string, chord: Chord): Promise<void> {
    const current = await this.getOverrides();
    const updated = { ...current, [id]: chord };

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SHORTCUT_OVERRIDES_STORAGE_KEY]: updated });
      return;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SHORTCUT_OVERRIDES_STORAGE_KEY, JSON.stringify(updated));
        this.notifyListeners(updated);
      } catch {
        // ignore
      }
    }
  }

  async resetOverride(id: string): Promise<void> {
    const current = await this.getOverrides();
    if (!(id in current)) return;

    const updated = { ...current };
    delete updated[id];

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SHORTCUT_OVERRIDES_STORAGE_KEY]: updated });
      return;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SHORTCUT_OVERRIDES_STORAGE_KEY, JSON.stringify(updated));
        this.notifyListeners(updated);
      } catch {
        // ignore
      }
    }
  }

  async resetAll(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(SHORTCUT_OVERRIDES_STORAGE_KEY);
      return;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SHORTCUT_OVERRIDES_STORAGE_KEY);
        this.notifyListeners({});
      } catch {
        // ignore
      }
    }
  }

  private fallbackListeners: Set<(overrides: Record<string, Chord>) => void> = new Set();

  private notifyListeners(overrides: Record<string, Chord>): void {
    for (const listener of this.fallbackListeners) {
      try {
        listener(overrides);
      } catch {
        // ignore
      }
    }
  }

  onChange(callback: (overrides: Record<string, Chord>) => void): () => void {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
      ): void => {
        if (areaName === 'local' && SHORTCUT_OVERRIDES_STORAGE_KEY in changes) {
          const newRaw = changes[SHORTCUT_OVERRIDES_STORAGE_KEY].newValue;
          callback(parseOverridesSafe(newRaw));
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }

    this.fallbackListeners.add(callback);
    return () => {
      this.fallbackListeners.delete(callback);
    };
  }
}

let defaultShortcutStorage: IShortcutStorage | null = null;

export function getShortcutStorage(): IShortcutStorage {
  if (!defaultShortcutStorage) {
    defaultShortcutStorage = new ChromeShortcutStorage();
  }
  return defaultShortcutStorage;
}
