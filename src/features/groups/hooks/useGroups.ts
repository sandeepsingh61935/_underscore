/**
 * @file useGroups.ts
 * @description Live Page Groups list for the extension popup (plan Phase 1
 * Task 1.5). Wraps the GROUPS_LIST message bus channel; never calls
 * chrome.runtime.sendMessage directly. Returns a safe empty fallback outside
 * the extension context (web) — web reads land in Task 2.5.
 */

import { useCallback, useEffect, useState } from 'react';

import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import { hasChromeRuntime, useIpcAction } from '@/shared/hooks/useIpcAction';
import { GROUPS_LIST } from '@/shared/schemas/message-schemas';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

interface GroupsResult {
  groups: PageGroup[];
  items: PageGroupItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGroups(): GroupsResult {
  const [groups, setGroups] = useState<PageGroup[]>([]);
  const [items, setItems] = useState<PageGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const listAction = useIpcAction<
    Record<string, never>,
    { groups: PageGroup[]; items: PageGroupItem[] }
  >(GROUPS_LIST);

  const fetchGroups = useCallback(async () => {
    if (!hasChromeRuntime()) {
      setGroups([]);
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAction({});
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch groups');
      }
      setGroups(result.data.groups ?? []);
      setItems(result.data.items ?? []);
    } catch (err) {
      setGroups([]);
      setItems([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch groups'));
    } finally {
      setIsLoading(false);
    }
  }, [listAction]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useLibraryDataChanged(
    useCallback(() => {
      void fetchGroups();
    }, [fetchGroups])
  );

  return { groups, items, isLoading, error, refetch: fetchGroups };
}
