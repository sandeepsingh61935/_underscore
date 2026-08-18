import { useState, useEffect, useRef } from 'react';

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

type SessionKey = string;

/** mode + auth seat — survives popup view unmount within one open. */
const sessionByKey = new Map<SessionKey, DashboardData>();

function sessionKey(mode: ModeType, isAuthenticated: boolean): SessionKey {
  return `${mode}:${isAuthenticated ? 'auth' : 'guest'}`;
}

export function clearDashboardDataSessionMemory(): void {
  sessionByKey.clear();
}

/**
 * Dashboard data from GET_DASHBOARD_DATA.
 * Activity order is owned by HighlightQueryService — do not re-sort here (PRD L4).
 * Warm session memory: remount paints last snapshot; refetch does not blank UI.
 */
export function useDashboardData(mode: ModeType, isAuthenticated: boolean) {
  const key = sessionKey(mode, isAuthenticated);
  const warm = sessionByKey.get(key) ?? null;

  const [data, setData] = useState<DashboardData | null>(warm);
  const [isLoading, setIsLoading] = useState(warm === null);
  const [error, setError] = useState<Error | null>(null);

  const fetchAction = useIpcAction<{ mode: ModeType }, DashboardData>('GET_DASHBOARD_DATA');
  const fetchActionRef = useRef(fetchAction);
  fetchActionRef.current = fetchAction;
  const genRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  useEffect(() => {
    let cancelled = false;
    const gen = ++genRef.current;
    const activeKey = sessionKey(mode, isAuthenticated);
    const cached = sessionByKey.get(activeKey);

    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setData(null);
      setIsLoading(true);
    }
    setError(null);

    const fetchDashboardData = async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true || sessionByKey.has(activeKey);
      if (!silent) {
        setIsLoading(true);
      }

      const result = await fetchActionRef.current({ mode });
      if (cancelled || gen !== genRef.current) return;
      if (modeRef.current !== mode || authRef.current !== isAuthenticated) return;

      if (!result.success) {
        setError(new Error(result.error));
        if (!sessionByKey.has(activeKey)) {
          if (!isAuthenticated) {
            setData(EMPTY_DASHBOARD);
            sessionByKey.set(activeKey, EMPTY_DASHBOARD);
          }
        }
      } else {
        sessionByKey.set(activeKey, result.data);
        setData(result.data);
        setError(null);
      }
      setIsLoading(false);
    };

    void fetchDashboardData({ silent: Boolean(cached) });

    return () => {
      cancelled = true;
    };
  }, [mode, isAuthenticated]);

  useLibraryDataChanged(() => {
    void (async () => {
      const modeNow = modeRef.current;
      const authNow = authRef.current;
      const activeKey = sessionKey(modeNow, authNow);
      const result = await fetchActionRef.current({ mode: modeNow });
      if (modeRef.current !== modeNow || authRef.current !== authNow) return;

      if (!result.success) {
        setError(new Error(result.error));
        return;
      }
      sessionByKey.set(activeKey, result.data);
      setData(result.data);
      setIsLoading(false);
      setError(null);
    })();
  });

  // Drop opposite-auth snapshots when auth flips (no flash of prior user on next open of that seat).
  useEffect(() => {
    if (!isAuthenticated) {
      for (const k of [...sessionByKey.keys()]) {
        if (k.endsWith(':auth')) sessionByKey.delete(k);
      }
    }
  }, [isAuthenticated]);

  return { data, isLoading, error };
}
