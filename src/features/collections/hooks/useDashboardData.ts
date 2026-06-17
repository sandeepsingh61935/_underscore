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

export function useDashboardData(mode: ModeType) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAction = useIpcAction<{ mode: ModeType }, DashboardData>('GET_DASHBOARD_DATA');

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
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
  }, [mode, fetchAction]);

  return { data, isLoading, error };
}
