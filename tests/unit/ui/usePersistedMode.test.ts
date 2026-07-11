import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';

vi.mock('@/shared/services/broadcast-mode-to-tabs', () => ({
  broadcastModeToTabs: vi.fn().mockResolvedValue(undefined),
}));

import { broadcastModeToTabs } from '@/shared/services/broadcast-mode-to-tabs';

describe('usePersistedMode', () => {
  let storageData: Record<string, unknown>;
  let onChangedListeners: Array<
    (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
  >;

  beforeEach(() => {
    storageData = {};
    onChangedListeners = [];
    vi.mocked(broadcastModeToTabs).mockClear();

    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[] | Record<string, unknown>) => {
            const keyList = Array.isArray(keys)
              ? keys
              : typeof keys === 'string'
                ? [keys]
                : Object.keys(keys);
            const result: Record<string, unknown> = {};
            for (const key of keyList) {
              if (key in storageData) result[key] = storageData[key];
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((items: Record<string, unknown>) => {
            Object.assign(storageData, items);
            const changes: Record<string, chrome.storage.StorageChange> = {};
            for (const [key, value] of Object.entries(items)) {
              changes[key] = { oldValue: storageData[key], newValue: value };
            }
            onChangedListeners.forEach((fn) => fn(changes, 'local'));
            return Promise.resolve();
          }),
        },
        onChanged: {
          addListener: vi.fn((fn) => {
            onChangedListeners.push(fn);
          }),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as typeof chrome;
  });

  it('promotes legacy ephemeral (now basic) to pro on session restore when authenticated', async () => {
    storageData[MODE_STORAGE_KEY] = 'ephemeral';

    const { result } = renderHook(() => usePersistedMode(true));

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    expect(result.current.currentMode).toBe('pro');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ [MODE_STORAGE_KEY]: 'pro' });
    expect(broadcastModeToTabs).toHaveBeenCalledWith('pro');
  });

  it('preserves basic mode when not authenticated on session restore', async () => {
    storageData[MODE_STORAGE_KEY] = 'basic';

    const { result } = renderHook(() => usePersistedMode(false));

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    expect(result.current.currentMode).toBe('basic');
    expect(broadcastModeToTabs).not.toHaveBeenCalled();
  });

  it('promotes basic to pro when user logs in', async () => {
    const { result, rerender } = renderHook(
      ({ authed }: { authed: boolean }) => usePersistedMode(authed),
      { initialProps: { authed: false } }
    );

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    expect(result.current.currentMode).toBe('basic');

    rerender({ authed: true });

    await waitFor(() => {
      expect(result.current.currentMode).toBe('pro');
    });

    expect(broadcastModeToTabs).toHaveBeenCalledWith('pro');
  });

  it('broadcasts SET_MODE when persistMode is called', async () => {
    const { result } = renderHook(() => usePersistedMode(true));

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    vi.mocked(broadcastModeToTabs).mockClear();

    await act(async () => {
      await result.current.persistMode('pro_xai');
    });

    expect(result.current.currentMode).toBe('pro_xai');
    expect(broadcastModeToTabs).toHaveBeenCalledWith('pro_xai');
  });

  it('downgrades pro to basic on logout and broadcasts', async () => {
    storageData[MODE_STORAGE_KEY] = 'pro';

    const { result, rerender } = renderHook(
      ({ authed }: { authed: boolean }) => usePersistedMode(authed),
      { initialProps: { authed: true } }
    );

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    vi.mocked(broadcastModeToTabs).mockClear();

    rerender({ authed: false });

    await waitFor(() => {
      expect(result.current.currentMode).toBe('basic');
    });

    expect(broadcastModeToTabs).toHaveBeenCalledWith('basic');
  });

  it('rejects basic mode while authenticated', async () => {
    const { result } = renderHook(() => usePersistedMode(true));

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    vi.mocked(broadcastModeToTabs).mockClear();

    await act(async () => {
      await result.current.persistMode('basic');
    });

    expect(result.current.currentMode).not.toBe('basic');
    expect(broadcastModeToTabs).not.toHaveBeenCalledWith('basic');
  });

  it('falls back to in-memory mode when chrome.storage is unavailable (web SPA)', async () => {
    // @ts-expect-error simulate plain browser without extension APIs
    global.chrome = undefined;

    const { result } = renderHook(() => usePersistedMode(false));

    await waitFor(() => {
      expect(result.current.modeReady).toBe(true);
    });

    expect(result.current.currentMode).toBe('basic');
  });
});
