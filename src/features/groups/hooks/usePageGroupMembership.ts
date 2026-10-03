/**
 * @file usePageGroupMembership.ts
 * @description Which groups cover a page URL — backs the Home "This page"
 * chip ("In: X +1", "via host") in Task 1.8. Wraps GROUP_MEMBERSHIP_FOR_URL;
 * safe empty fallback outside the extension context.
 */

import { useCallback, useEffect, useState } from 'react';

import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import { hasChromeRuntime, useIpcAction } from '@/shared/hooks/useIpcAction';
import { GROUP_MEMBERSHIP_FOR_URL } from '@/shared/schemas/message-schemas';
import type { PageGroup } from '@/shared/types/page-group';

export interface PageGroupMembership {
  group: PageGroup;
  viaHostname: string | null;
}

interface MembershipResult {
  memberships: PageGroupMembership[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePageGroupMembership(url: string | null): MembershipResult {
  const [memberships, setMemberships] = useState<PageGroupMembership[]>([]);
  const [isLoading, setIsLoading] = useState(url !== null);
  const [error, setError] = useState<Error | null>(null);

  const membershipAction = useIpcAction<
    { url: string },
    { memberships: PageGroupMembership[] }
  >(GROUP_MEMBERSHIP_FOR_URL);

  const fetchMemberships = useCallback(async () => {
    if (url === null || !hasChromeRuntime()) {
      setMemberships([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await membershipAction({ url });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch group membership');
      }
      setMemberships(result.data.memberships ?? []);
    } catch (err) {
      setMemberships([]);
      setError(
        err instanceof Error ? err : new Error('Failed to fetch group membership')
      );
    } finally {
      setIsLoading(false);
    }
  }, [membershipAction, url]);

  useEffect(() => {
    void fetchMemberships();
  }, [fetchMemberships]);

  useLibraryDataChanged(
    useCallback(() => {
      void fetchMemberships();
    }, [fetchMemberships])
  );

  return { memberships, isLoading, error, refetch: fetchMemberships };
}
