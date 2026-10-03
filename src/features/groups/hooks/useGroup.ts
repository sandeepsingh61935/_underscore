/**
 * @file useGroup.ts
 * @description Single Page Group with its items for the popup detail view
 * (plan Phase 1 Task 1.5). Wraps GROUP_GET; safe empty fallback outside the
 * extension context.
 */

import { useCallback, useEffect, useState } from 'react';

import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import { hasChromeRuntime, useIpcAction } from '@/shared/hooks/useIpcAction';
import { GROUP_GET } from '@/shared/schemas/message-schemas';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

interface GroupResult {
  group: PageGroup | null;
  items: PageGroupItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGroup(groupId: string | null): GroupResult {
  const [group, setGroup] = useState<PageGroup | null>(null);
  const [items, setItems] = useState<PageGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(groupId !== null);
  const [error, setError] = useState<Error | null>(null);

  const getAction = useIpcAction<
    { id: string },
    { group: PageGroup; items: PageGroupItem[] }
  >(GROUP_GET);

  const fetchGroup = useCallback(async () => {
    if (groupId === null || !hasChromeRuntime()) {
      setGroup(null);
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAction({ id: groupId });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch group');
      }
      setGroup(result.data.group);
      setItems(result.data.items ?? []);
    } catch (err) {
      setGroup(null);
      setItems([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch group'));
    } finally {
      setIsLoading(false);
    }
  }, [getAction, groupId]);

  useEffect(() => {
    void fetchGroup();
  }, [fetchGroup]);

  useLibraryDataChanged(
    useCallback(() => {
      void fetchGroup();
    }, [fetchGroup])
  );

  return { group, items, isLoading, error, refetch: fetchGroup };
}
