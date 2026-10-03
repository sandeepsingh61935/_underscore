/**
 * @file useUngroupedTabs.ts
 * @description Hook querying open, ungrouped syncable tabs in the current window.
 */

import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { isSyncableTabUrl } from '@/shared/utils/syncable-url';

export interface UngroupedTab {
  id: number;
  url: string;
  title: string | null;
  favIconUrl: string | null;
}

export interface UngroupedTabsResult {
  tabs: UngroupedTab[];
  isSupported: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUngroupedTabs(): UngroupedTabsResult {
  const [tabs, setTabs] = useState<UngroupedTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUngroupedTabs = useCallback(async (): Promise<UngroupedTab[]> => {
    try {
      let rawTabs: any[] = [];
      const tabsApi = (browser as any)?.tabs ?? (globalThis as any)?.chrome?.tabs;

      if (tabsApi?.query) {
        if (typeof tabsApi.query === 'function') {
          const res = tabsApi.query({ currentWindow: true });
          rawTabs =
            res && typeof res.then === 'function'
              ? await res
              : await new Promise((r) => tabsApi.query({ currentWindow: true }, r));
        }
      }

      if (!Array.isArray(rawTabs)) return [];

      const tabGroupsApi = (browser as any)?.tabGroups ?? (globalThis as any)?.chrome?.tabGroups;
      const noneGroupId = tabGroupsApi?.TAB_GROUP_ID_NONE ?? -1;

      const ungrouped = rawTabs.filter((tab) => {
        if (tab.incognito) return false;
        const gId = tab.groupId;
        const isUngrouped =
          gId === undefined ||
          gId === null ||
          gId <= 0 ||
          gId === noneGroupId;
        if (!isUngrouped) return false;
        if (!tab.url || !isSyncableTabUrl(tab.url, tab.incognito)) return false;
        return true;
      });

      return ungrouped.map((tab) => ({
        id: tab.id ?? 0,
        url: tab.url ?? '',
        title: tab.title ?? null,
        favIconUrl: tab.favIconUrl ?? null,
      }));
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchUngroupedTabs();
      setTabs(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTabs([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUngroupedTabs]);

  useEffect(() => {
    let mounted = true;

    fetchUngroupedTabs()
      .then((res) => {
        if (mounted) {
          setTabs(res);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setTabs([]);
          setIsLoading(false);
        }
      });

    const tabsApi = (browser as any)?.tabs ?? (globalThis as any)?.chrome?.tabs;
    const handleChange = () => {
      if (mounted) {
        void fetchUngroupedTabs()
          .then((res) => {
            if (mounted) setTabs(res);
          })
          .catch(() => {});
      }
    };

    if (tabsApi?.onUpdated?.addListener) tabsApi.onUpdated.addListener(handleChange);
    if (tabsApi?.onCreated?.addListener) tabsApi.onCreated.addListener(handleChange);
    if (tabsApi?.onRemoved?.addListener) tabsApi.onRemoved.addListener(handleChange);
    if (tabsApi?.onAttached?.addListener) tabsApi.onAttached.addListener(handleChange);
    if (tabsApi?.onDetached?.addListener) tabsApi.onDetached.addListener(handleChange);

    return () => {
      mounted = false;
      if (tabsApi?.onUpdated?.removeListener) tabsApi.onUpdated.removeListener(handleChange);
      if (tabsApi?.onCreated?.removeListener) tabsApi.onCreated.removeListener(handleChange);
      if (tabsApi?.onRemoved?.removeListener) tabsApi.onRemoved.removeListener(handleChange);
      if (tabsApi?.onAttached?.removeListener) tabsApi.onAttached.removeListener(handleChange);
      if (tabsApi?.onDetached?.removeListener) tabsApi.onDetached.removeListener(handleChange);
    };
  }, [fetchUngroupedTabs]);

  const isSupported = Boolean(
    (browser as any)?.tabs?.query || (globalThis as any)?.chrome?.tabs?.query
  );

  return {
    tabs,
    isSupported,
    isLoading,
    error,
    refetch,
  };
}
