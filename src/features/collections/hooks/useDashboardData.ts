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

export function useDashboardData(mode: ModeType) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_DASHBOARD_DATA',
            mode: mode,
            timestamp: Date.now(),
          });

          if (cancelled) return;

          if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to fetch dashboard data');
          }

          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return { data, isLoading, error };
}
