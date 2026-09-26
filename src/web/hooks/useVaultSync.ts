/**
 * @file useVaultSync.ts
 * @description React hook for managing Local Vault Mirror Sync lifecycle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  checkPermission,
  clearVaultDirectoryHandle,
  clearVaultSyncMeta,
  getVaultDirectoryHandle,
  getVaultSyncMeta,
  isFileSystemAccessSupported,
  saveVaultDirectoryHandle,
  syncHighlightsToVaultDirectory,
  verifyPermission,
  type VaultHighlightItem,
  type VaultSyncResult,
} from '@/web/services/vault-sync-service';

export type VaultConnectionState =
  'unsupported' | 'disconnected' | 'need-permission' | 'connected';

export interface UseVaultSyncOptions {
  highlights: VaultHighlightItem[];
  isAuthenticated: boolean;
  autoSync?: boolean;
  debounceMs?: number;
}

export interface UseVaultSyncReturn {
  isSupported: boolean;
  connectionState: VaultConnectionState;
  vaultName: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncResult: VaultSyncResult | null;
  error: string | null;
  selectVaultFolder: () => Promise<boolean>;
  authorizeVault: () => Promise<boolean>;
  disconnectVault: () => Promise<void>;
  syncNow: () => Promise<VaultSyncResult | null>;
}

export function useVaultSync({
  highlights,
  isAuthenticated,
  autoSync = true,
  debounceMs = 1500,
}: UseVaultSyncOptions): UseVaultSyncReturn {
  const isSupported = isFileSystemAccessSupported();

  const [connectionState, setConnectionState] = useState<VaultConnectionState>(
    isSupported ? 'disconnected' : 'unsupported'
  );
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [vaultName, setVaultName] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<VaultSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;

  const dirHandleRef = useRef(directoryHandle);
  dirHandleRef.current = directoryHandle;

  // Initialize from storage on mount
  useEffect(() => {
    if (!isSupported) {
      setConnectionState('unsupported');
      return;
    }

    let isMounted = true;
    void (async () => {
      try {
        const meta = getVaultSyncMeta();
        if (meta.lastSyncedAt) {
          setLastSyncedAt(meta.lastSyncedAt);
        }
        if (meta.vaultName) {
          setVaultName(meta.vaultName);
        }

        const handle = await getVaultDirectoryHandle();
        if (!isMounted) return;

        if (!handle) {
          setConnectionState('disconnected');
          setDirectoryHandle(null);
          return;
        }

        setDirectoryHandle(handle);
        if (handle.name) {
          setVaultName(handle.name);
        }

        const permission = await checkPermission(handle, true);
        if (!isMounted) return;

        if (permission === 'granted') {
          setConnectionState('connected');
        } else {
          setConnectionState('need-permission');
        }
      } catch (_e) {
        if (!isMounted) return;
        setConnectionState('disconnected');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isSupported]);

  const executeSync = useCallback(
    async (handleToUse?: FileSystemDirectoryHandle): Promise<VaultSyncResult | null> => {
      const handle = handleToUse ?? dirHandleRef.current;
      if (!handle) return null;

      setIsSyncing(true);
      setError(null);

      try {
        const result = await syncHighlightsToVaultDirectory(
          highlightsRef.current,
          handle
        );
        setSyncResult(result);
        setLastSyncedAt(result.lastSyncedAt);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setError(msg);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const selectVaultFolder = useCallback(async (): Promise<boolean> => {
    type PickerWindow = Window & {
      showDirectoryPicker?: (options?: {
        mode?: 'read' | 'readwrite';
      }) => Promise<FileSystemDirectoryHandle>;
    };
    const pickerWindow =
      typeof window !== 'undefined' ? (window as PickerWindow) : undefined;
    if (!isSupported || !pickerWindow?.showDirectoryPicker) {
      setError('File System Access API is not supported in this browser');
      return false;
    }

    setError(null);
    try {
      const handle: FileSystemDirectoryHandle = await pickerWindow.showDirectoryPicker({
        mode: 'readwrite',
      });

      const granted = await verifyPermission(handle, true);
      if (!granted) {
        setError('Write permission was not granted for the selected folder');
        return false;
      }

      await saveVaultDirectoryHandle(handle);
      setDirectoryHandle(handle);
      setVaultName(handle.name);
      setConnectionState('connected');

      // Trigger sync immediately with new folder
      void executeSync(handle);
      return true;
    } catch (err) {
      // If user aborted/cancelled the picker, don't show an error
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to select vault directory');
      return false;
    }
  }, [isSupported, executeSync]);

  const authorizeVault = useCallback(async (): Promise<boolean> => {
    const handle = dirHandleRef.current ?? (await getVaultDirectoryHandle());
    if (!handle) {
      setConnectionState('disconnected');
      return false;
    }

    setError(null);
    try {
      const granted = await verifyPermission(handle, true);
      if (granted) {
        setDirectoryHandle(handle);
        setVaultName(handle.name);
        setConnectionState('connected');
        void executeSync(handle);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed');
      return false;
    }
  }, [executeSync]);

  const disconnectVault = useCallback(async (): Promise<void> => {
    await clearVaultDirectoryHandle();
    clearVaultSyncMeta();
    setDirectoryHandle(null);
    setVaultName(null);
    setLastSyncedAt(null);
    setSyncResult(null);
    setError(null);
    setConnectionState(isSupported ? 'disconnected' : 'unsupported');
  }, [isSupported]);

  const syncNow = useCallback(async (): Promise<VaultSyncResult | null> => {
    return executeSync();
  }, [executeSync]);

  // Debounced auto-sync
  useEffect(() => {
    if (
      !autoSync ||
      !isAuthenticated ||
      connectionState !== 'connected' ||
      !directoryHandle
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void executeSync();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    autoSync,
    isAuthenticated,
    connectionState,
    directoryHandle,
    highlights,
    debounceMs,
    executeSync,
  ]);

  return {
    isSupported,
    connectionState,
    vaultName,
    lastSyncedAt,
    isSyncing,
    syncResult,
    error,
    selectVaultFolder,
    authorizeVault,
    disconnectVault,
    syncNow,
  };
}
