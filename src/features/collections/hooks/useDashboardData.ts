import { useState, useEffect } from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

export interface DashboardData {
  totalHighlights: number;
  totalDomains: number;
  thisWeekCount: number;
  todayCount: number;
  withNotesCount: number;
  withTagsCount: number;
  recentHighlights: Array<{
    id: string;
    text: string;
    url: string;
    path: string;
    domain: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    notes?: string;
    tags?: string[];
    sourceKind?: 'code';
    language?: string;
    presentation?: HighlightPresentation;
  }>;
}

const EMPTY_DASHBOARD: DashboardData = {
  totalHighlights: 0,
  totalDomains: 0,
  thisWeekCount: 0,
  todayCount: 0,
  withNotesCount: 0,
  withTagsCount: 0,
  recentHighlights: [],
};

/**
 * Dashboard data from GET_DASHBOARD_DATA.
 * Activity order is owned by HighlightQueryService — do not re-sort here (PRD L4).
 */
export function useDashboardData(mode: ModeType, isAuthenticated: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAction = useIpcAction<{ mode: ModeType }, DashboardData>('GET_DASHBOARD_DATA');

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      const result = await fetchAction({ mode });
      if (cancelled) return;

      if (!result.success) {
        setError(new Error(result.error));
        if (!isAuthenticated) {
          setData((prev) => prev ?? EMPTY_DASHBOARD);
        }
      } else {
        setData(result.data);
        setError(null);
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
      const result = await fetchAction({ mode });
      if (!result.success) {
        setError(new Error(result.error));
        return;
      }
      setData(result.data);
      setIsLoading(false);
      setError(null);
    })();
  });

  return { data, isLoading, error };
}
