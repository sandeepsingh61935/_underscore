import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPopupDomainSection,
  isPersistedPopupView,
  loadPopupNavigationSnapshot,
  persistLlmSetupProvider,
  persistPopupDomain,
  persistPopupSection,
  persistPopupView,
  POPUP_NAV_STORAGE_KEYS,
} from '@/shared/constants/popup-navigation-storage';

describe('popup-navigation-storage', () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            const out: Record<string, unknown> = {};
            for (const key of keyList) {
              if (storage.has(key)) out[key] = storage.get(key);
            }
            return out;
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              storage.set(key, value);
            }
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const key of keyList) storage.delete(key);
          }),
        },
      },
    });
  });

  it('isPersistedPopupView accepts navigable views only', () => {
    expect(isPersistedPopupView('SETTINGS')).toBe(true);
    expect(isPersistedPopupView('DASHBOARD')).toBe(true);
    expect(isPersistedPopupView('API_KEY_SETUP')).toBe(false);
    expect(isPersistedPopupView('ASK')).toBe(false);
    expect(isPersistedPopupView('AUTH')).toBe(false);
    expect(isPersistedPopupView('LOADING')).toBe(false);
    expect(isPersistedPopupView('WELCOME')).toBe(false);
  });

  it('persistPopupView skips transient views including auth', async () => {
    await persistPopupView('LOADING');
    expect(storage.has(POPUP_NAV_STORAGE_KEYS.lastView)).toBe(false);

    await persistPopupView('AUTH');
    expect(storage.has(POPUP_NAV_STORAGE_KEYS.lastView)).toBe(false);

    await persistPopupView('SETTINGS');
    expect(storage.get(POPUP_NAV_STORAGE_KEYS.lastView)).toBe('SETTINGS');
  });

  it('loadPopupNavigationSnapshot returns saved navigation context', async () => {
    await persistPopupView('SUB_DOMAIN');
    await persistPopupDomain('example.com');
    await persistPopupSection('docs');
    await persistLlmSetupProvider('openrouter');

    await expect(loadPopupNavigationSnapshot()).resolves.toEqual({
      lastView: 'SUB_DOMAIN',
      lastDomain: 'example.com',
      lastSection: 'docs',
      lastLlmSetupProvider: 'openrouter',
    });
  });

  it('clearPopupDomainSection removes domain drill-down keys', async () => {
    await persistPopupDomain('example.com');
    await persistPopupSection('docs');
    await clearPopupDomainSection();

    const snapshot = await loadPopupNavigationSnapshot();
    expect(snapshot.lastDomain).toBeUndefined();
    expect(snapshot.lastSection).toBeUndefined();
  });
});
