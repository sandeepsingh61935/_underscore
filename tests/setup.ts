/**
 * @file test/setup.ts
 * @description Global test setup for Vitest
 */

import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Augment global type for browser API
declare global {

  var browser: {
    storage: {
      local: {
        clear: () => Promise<void>;
        get: (keys?: string | string[]) => Promise<Record<string, unknown>>;
        set: (items: Record<string, unknown>) => Promise<void>;
        remove: (keys: string | string[]) => Promise<void>;
      };
    };
    runtime: {
      sendMessage: (message: unknown) => Promise<unknown>;
      onMessage: {
        addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void) => void;
        removeListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void) => void;
      };
    };
    tabs: {
      query: (queryInfo: object) => Promise<unknown[]>;
      sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
    };
    notifications: {
      create: (options: unknown, callback?: (notificationId: string) => void) => void;
      clear: (notificationId: string, callback?: (wasCleared: boolean) => void) => void;
      onClicked: {
        addListener: (callback: (notificationId: string) => void) => void;
        removeListener: (callback: (notificationId: string) => void) => void;
      };
    };
  };
}

// Polyfill for crypto.randomUUID in test environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  global.crypto = {
    ...global.crypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  } as Crypto;
}

// Mock browser.storage API for extension tests
const storageData = new Map<string, any>();

// @ts-ignore - Augmenting global object
global.browser = {
  storage: {
    local: {
      get: vi.fn().mockImplementation(async (keys?: string | string[]) => {
        if (!keys) {
          // Return all storage
          return Object.fromEntries(storageData);
        }
        if (typeof keys === 'string') {
          return { [keys]: storageData.get(keys) };
        }
        const result: Record<string, any> = {};
        for (const key of keys) {
          result[key] = storageData.get(key);
        }
        return result;
      }),
      set: vi.fn().mockImplementation(async (items: Record<string, any>) => {
        for (const [key, value] of Object.entries(items)) {
          storageData.set(key, value);
        }
      }),
      remove: vi.fn().mockImplementation(async (keys: string | string[]) => {
        const keysArray = typeof keys === 'string' ? [keys] : keys;
        for (const key of keysArray) {
          storageData.delete(key);
        }
      }),
      clear: vi.fn().mockImplementation(async () => {
        storageData.clear();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  notifications: {
    // @ts-ignore
    create: vi.fn().mockImplementation((opts, cb) => cb && cb('mock-notification-id')),
    // @ts-ignore
    clear: vi.fn().mockImplementation((id, cb) => cb && cb(true)),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// Also set chrome for compatibility
// @ts-ignore - Augmenting global object
global.chrome = global.browser;

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };

global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Restore console for debugging when needed
export const restoreConsole = (): void => {
  global.console = originalConsole;
};
