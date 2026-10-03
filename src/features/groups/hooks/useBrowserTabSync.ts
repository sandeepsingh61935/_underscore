/**
 * @file useBrowserTabSync.ts
 * @description Hook managing browser tab sync state, permissions, settings toggles,
 * and permission revocation.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { browser } from 'wxt/browser';

import { GROUPS_BROWSER_SYNC_ENABLED } from '@/shared/constants/groups-flags';
import {
  isTabGroupApiAvailable,
  isTabGroupSupported,
  onTabGroupPermissionsRemoved,
  requestTabGroupPermissions,
} from '@/shared/permissions/ensure-tab-group-permissions';
import { GROUPS_DISABLE_BROWSER_SYNC } from '@/shared/schemas/message-schemas';
import { trackEvent } from '@/web/lib/analytics';

export const REVOCATION_TOAST_MESSAGE =
  'Browser tab sync turned off. Your groups are kept as manual groups.';

export interface BrowserTabSyncState {
  isSupported: boolean;
  isEnabled: boolean;
  autoSyncNewGroups: boolean;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  enableSync: () => Promise<boolean>;
  disableSync: () => Promise<void>;
  setAutoSyncNewGroups: (val: boolean) => Promise<void>;
}

const getStorage = () => (browser as any)?.storage?.local ?? (globalThis as any)?.chrome?.storage?.local;

async function readStorage(keys: string[]): Promise<Record<string, any>> {
  const storage = getStorage();
  if (!storage?.get) return {};
  try {
    const res = storage.get(keys);
    if (res && typeof res.then === 'function') {
      return (await res) || {};
    }
    return await new Promise<Record<string, any>>((resolve) => {
      storage.get(keys, (items: Record<string, any>) => resolve(items || {}));
    });
  } catch {
    return {};
  }
}

async function writeStorage(items: Record<string, any>): Promise<void> {
  const storage = getStorage();
  if (!storage?.set) return;
  try {
    const res = storage.set(items);
    if (res && typeof res.then === 'function') {
      await res;
      return;
    }
    await new Promise<void>((resolve) => {
      storage.set(items, () => resolve());
    });
  } catch {
    // Ignore storage write error
  }
}

export function useBrowserTabSync(): BrowserTabSyncState {
  const isSupported =
    GROUPS_BROWSER_SYNC_ENABLED &&
    (typeof isTabGroupSupported === 'function'
      ? isTabGroupSupported()
      : isTabGroupApiAvailable());
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoSyncNewGroups, setAutoSyncNewGroupsState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Initialize from storage & check permissions
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupported) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const res = await readStorage([
          'groups_browser_sync_enabled',
          'groups_auto_sync_new_tab_groups',
        ]);

        if (mounted) {
          const syncEnabled = Boolean(res?.['groups_browser_sync_enabled']);
          const autoSync =
            res?.['groups_auto_sync_new_tab_groups'] !== undefined
              ? Boolean(res['groups_auto_sync_new_tab_groups'])
              : true;
          setIsEnabled(syncEnabled);
          setAutoSyncNewGroupsState(autoSync);
        }
      } catch {
        // Ignore storage read error
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void init();

    // Listen for storage changes
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      if (changes['groups_browser_sync_enabled']) {
        setIsEnabled(Boolean(changes['groups_browser_sync_enabled'].newValue));
      }
      if (changes['groups_auto_sync_new_tab_groups']) {
        setAutoSyncNewGroupsState(Boolean(changes['groups_auto_sync_new_tab_groups'].newValue));
      }
    };

    const storageObj = (browser as any)?.storage ?? (globalThis as any)?.chrome?.storage;
    if (storageObj?.onChanged?.addListener) {
      storageObj.onChanged.addListener(handleStorageChange);
    }

    // Subscribe to permission revocation
    const unsubscribeRevocation = onTabGroupPermissionsRemoved(() => {
      void writeStorage({ groups_browser_sync_enabled: false });
      setIsEnabled(false);
      trackEvent('browser_sync_disabled');
      toast(REVOCATION_TOAST_MESSAGE);
    });

    return () => {
      mounted = false;
      if (storageObj?.onChanged?.removeListener) {
        storageObj.onChanged.removeListener(handleStorageChange);
      }
      unsubscribeRevocation();
    };
  }, [isSupported]);

  const enableSync = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    setError(null);
    try {
      const granted = await requestTabGroupPermissions();
      if (!granted) {
        setPermissionDenied(true);
        setError('Permission required to sync browser tab groups');
        setIsLoading(false);
        return false;
      }

      setPermissionDenied(false);
      await writeStorage({ groups_browser_sync_enabled: true });
      setIsEnabled(true);
      trackEvent('browser_sync_enabled');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to enable tab group sync');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  const disableSync = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await writeStorage({ groups_browser_sync_enabled: false });
      setIsEnabled(false);
      trackEvent('browser_sync_disabled');

      // Call service / background handler to clear bindings
      const runtime = (browser as any)?.runtime ?? (globalThis as any)?.chrome?.runtime;
      if (runtime?.sendMessage) {
        try {
          const res = runtime.sendMessage({
            type: GROUPS_DISABLE_BROWSER_SYNC,
            payload: {},
            timestamp: Date.now(),
          });
          if (res && typeof res.then === 'function') {
            await res;
          }
        } catch {
          // Ignore messaging error if background is idle/unavailable
        }
      }

      toast(REVOCATION_TOAST_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAutoSyncNewGroups = useCallback(async (val: boolean): Promise<void> => {
    await writeStorage({ groups_auto_sync_new_tab_groups: val });
    setAutoSyncNewGroupsState(val);
  }, []);

  return {
    isSupported,
    isEnabled,
    autoSyncNewGroups,
    isLoading,
    error,
    permissionDenied,
    enableSync,
    disableSync,
    setAutoSyncNewGroups,
  };
}
