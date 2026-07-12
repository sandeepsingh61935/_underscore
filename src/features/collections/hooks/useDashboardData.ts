import { useState, useEffect } from 'react';

export interface DashboardData {
  totalHighlights: number;
  totalDomains: number;
  thisWeekCount: number;
  recentHighlights: Array<{
    id: string;
    text: string;
    url: string;
    path: string;
    domain: string;
    createdAt: string;
  }>;
}

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';

const EMPTY_DASHBOARD: DashboardData = {
  totalHighlights: 0,
  totalDomains: 0,
  thisWeekCount: 0,
  recentHighlights: [],
};

export function useDashboardData(mode: ModeType, isAuthenticated: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAction = useIpcAction<{ mode: ModeType }, DashboardData>('GET_DASHBOARD_DATA');

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      if (!isAuthenticated) {
        setData(EMPTY_DASHBOARD);
        setError(null);
      }

      setIsLoading(true);
      const result = await fetchAction({ mode });
      if (cancelled) return;

      if (!result.success) {
        setError(new Error(result.error));
      } else {
        setData(result.data);
      }
      setIsLoading(false);
    };

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [mode, isAuthenticated, fetchAction]);

  useLibraryDataChanged(() => {
    void (async () => {
      if (!isAuthenticated) {
        setData(EMPTY_DASHBOARD);
        setError(null);
      }
      const result = await fetchAction({ mode });
      if (!result.success) {
        setError(new Error(result.error));
        return;
      }
      setData(result.data);
      setIsLoading(false);
    })();
  });

  useLibraryDataChanged(() => {
    void (async () => {
      const result = await fetchAction({ mode });
      if (!result.success) {
        setError(new Error(result.error));
        return;
      }
      setData(result.data);
      setIsLoading(false);
    })();
  });

  return { data, isLoading, error };
}
