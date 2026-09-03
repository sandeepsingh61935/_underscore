/**
 * @file useVaultSync.test.ts
 * @description Unit tests for useVaultSync hook (state machine, directory selection, permission, sync).
 */
import 'fake-indexeddb/auto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVaultSync } from '@/web/hooks/useVaultSync';
import {
  clearVaultDirectoryHandle,
  clearVaultSyncMeta,
  saveVaultDirectoryHandle,
} from '@/web/services/vault-sync-service';

describe('useVaultSync', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearVaultDirectoryHandle();
    clearVaultSyncMeta();
  });

  it('reports unsupported when showDirectoryPicker is missing on window', async () => {
    const origPicker = (window as any).showDirectoryPicker;
    delete (window as any).showDirectoryPicker;

    try {
      const { result } = renderHook(() =>
        useVaultSync({
          highlights: [],
          isAuthenticated: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
        expect(result.current.connectionState).toBe('unsupported');
      });
    } finally {
      if (origPicker) (window as any).showDirectoryPicker = origPicker;
    }
  });

  it('initializes to disconnected when no directory handle is in IndexedDB', async () => {
    (window as any).showDirectoryPicker = vi.fn();

    const { result } = renderHook(() =>
      useVaultSync({
        highlights: [],
        isAuthenticated: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  it('selectVaultFolder calls showDirectoryPicker and transitions to connected', async () => {
    const mockHandle = {
      name: 'TestObsidianVault',
      kind: 'directory',
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      getDirectoryHandle: vi.fn().mockResolvedValue({
        getFileHandle: vi.fn().mockResolvedValue({
          createWritable: vi.fn().mockResolvedValue({
            write: vi.fn(),
            close: vi.fn(),
          }),
        }),
      }),
    };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(mockHandle);

    const { result } = renderHook(() =>
      useVaultSync({
        highlights: [
          {
            id: 'h1',
            domain: 'example.com',
            path: '/post',
            quote: 'Quote',
            note: '',
            tags: [],
            savedAt: 1000,
          },
        ],
        isAuthenticated: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connectionState).toBe('disconnected');
    });

    await act(async () => {
      await result.current.selectVaultFolder();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
      expect(result.current.vaultName).toBe('TestObsidianVault');
      expect(result.current.lastSyncedAt).not.toBeNull();
    });
  });

  it('sets state to need-permission when stored handle prompt permission', async () => {
    const mockHandle = {
      name: 'ExistingVault',
      kind: 'directory',
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      getDirectoryHandle: vi.fn().mockResolvedValue({
        getFileHandle: vi.fn().mockResolvedValue({
          createWritable: vi.fn().mockResolvedValue({
            write: vi.fn(),
            close: vi.fn(),
          }),
        }),
      }),
    };
    await saveVaultDirectoryHandle(mockHandle as any);

    (window as any).showDirectoryPicker = vi.fn();

    const { result } = renderHook(() =>
      useVaultSync({
        highlights: [],
        isAuthenticated: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connectionState).toBe('need-permission');
      expect(result.current.vaultName).toBe('ExistingVault');
    });

    await act(async () => {
      await result.current.authorizeVault();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });
  });

  it('disconnectVault clears handle and resets state to disconnected', async () => {
    const mockHandle = {
      name: 'ExistingVault',
      kind: 'directory',
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    await saveVaultDirectoryHandle(mockHandle as any);
    (window as any).showDirectoryPicker = vi.fn();

    const { result } = renderHook(() =>
      useVaultSync({
        highlights: [],
        isAuthenticated: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    await act(async () => {
      await result.current.disconnectVault();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.vaultName).toBeNull();
    });
  });
});
