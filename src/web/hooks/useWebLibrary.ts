/**
 * @file useWebLibrary.ts
 * @description Web library data hook: Supabase (or injected) fetch + pure aggregation.
 * Never uses chrome.runtime or MessageBus.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { getDomainFromUrl } from '@/shared/utils/domain-from-url';
import { highlightTimestampMs } from '@/shared/utils/supabase-highlight-row';
import {
  aggregateLibrary,
  type WebCurrentPage,
  type WebDomainNode,
  type WebHighlight,
  type WebLibraryStats,
} from '@/web/lib/aggregateLibrary';

export type {
  WebHighlight,
  WebDomainNode,
  WebLibraryStats,
  WebCurrentPage,
} from '@/web/lib/aggregateLibrary';

export type WebLibraryState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  isGuest: boolean;
  highlights: WebHighlight[];
  domains: WebDomainNode[];
  stats: WebLibraryStats;
  recent: WebHighlight[];
  currentPage: WebCurrentPage;
  error: string | null;
  refresh: () => Promise<void>;
};

export type UseWebLibraryOpts = {
  isAuthenticated: boolean;
  planLabel: string;
  /** Inject for tests; production default queries Supabase highlights. */
  fetchHighlights?: () => Promise<WebHighlight[]>;
};

function emptyStats(planLabel: string): WebLibraryStats {
  return {
    highlightCount: 0,
    pageCount: 0,
    thisWeekCount: 0,
    planLabel,
  };
}

/** Map a Supabase highlights row into WebHighlight. Skips soft-deleted / invalid URLs. */
export function mapSupabaseRowToWebHighlight(row: {
  id: string;
  url?: string | null;
  text?: string | null;
  metadata?: { notes?: string; tags?: string[] } | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}): WebHighlight | null {
  if (row.deleted_at != null && row.deleted_at !== '') {
    return null;
  }
  const url = row.url ?? '';
  if (!url) {
    return null;
  }

  const domain = getDomainFromUrl(url);
  if (!domain) {
    return null;
  }

  let path = '/';
  try {
    path = new URL(url).pathname || '/';
  } catch {
    return null;
  }

  const metadata = row.metadata ?? undefined;
  const tags = Array.isArray(metadata?.tags) ? metadata.tags.filter((t): t is string => typeof t === 'string') : [];
  const note = typeof metadata?.notes === 'string' ? metadata.notes : '';

  return {
    id: row.id,
    domain,
    path,
    quote: row.text ?? '',
    note,
    tags,
    savedAt: highlightTimestampMs(row.updated_at, row.created_at),
  };
}

async function defaultFetchHighlights(): Promise<WebHighlight[]> {
  const supabase = getWebSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }
  if (!session?.user) {
    return [];
  }

  const { data, error: queryError } = await supabase
    .from('highlights')
    .select('id, url, text, metadata, created_at, updated_at, deleted_at')
    .eq('user_id', session.user.id)
    .is('deleted_at', null);

  if (queryError) {
    throw queryError;
  }

  const out: WebHighlight[] = [];
  for (const row of data ?? []) {
    const mapped = mapSupabaseRowToWebHighlight(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

/**
 * Library data for the web product shell.
 * Guest is always empty (no seed). Signed-in uses injected fetch or Supabase.
 *
 * In-flight fetches are generation-gated: only the latest load/refresh/auth
 * generation may apply results, so logout and overlapping refresh cannot
 * leak prior-session data.
 */
export function useWebLibrary(opts: UseWebLibraryOpts): WebLibraryState {
  const { isAuthenticated, planLabel, fetchHighlights: fetchHighlightsOpt } = opts;
  const fetchRef = useRef(fetchHighlightsOpt);
  fetchRef.current = fetchHighlightsOpt;

  /** Bumped on every load attempt and on guest clear; stale completions ignore. */
  const loadGenRef = useRef(0);
  const planLabelRef = useRef(planLabel);
  planLabelRef.current = planLabel;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const [status, setStatus] = useState<WebLibraryState['status']>(
    isAuthenticated ? 'loading' : 'ready',
  );
  const [highlights, setHighlights] = useState<WebHighlight[]>([]);
  const [domains, setDomains] = useState<WebDomainNode[]>([]);
  const [stats, setStats] = useState<WebLibraryStats>(() => emptyStats(planLabel));
  const [recent, setRecent] = useState<WebHighlight[]>([]);
  const [currentPage, setCurrentPage] = useState<WebCurrentPage>(null);
  const [error, setError] = useState<string | null>(null);

  const applyEmpty = useCallback((readyStatus: 'ready' | 'error' = 'ready', err: string | null = null) => {
    setHighlights([]);
    setDomains([]);
    setStats(emptyStats(planLabelRef.current));
    setRecent([]);
    setCurrentPage(null);
    setError(err);
    setStatus(readyStatus);
  }, []);

  const applyRows = useCallback((rows: WebHighlight[]) => {
    const agg = aggregateLibrary(rows);
    setHighlights(rows);
    setDomains(agg.domains);
    setStats({ ...agg.stats, planLabel: planLabelRef.current });
    setRecent(agg.recent);
    setCurrentPage(agg.currentPage);
    setError(null);
    setStatus('ready');
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticatedRef.current) {
      loadGenRef.current += 1;
      applyEmpty('ready', null);
      return;
    }

    const gen = ++loadGenRef.current;
    // Clear prior session aggregate before fetch so re-login never flashes old data.
    setHighlights([]);
    setDomains([]);
    setRecent([]);
    setCurrentPage(null);
    setError(null);
    setStats(emptyStats(planLabelRef.current));
    setStatus('loading');

    try {
      const fetchFn = fetchRef.current ?? defaultFetchHighlights;
      const rows = await fetchFn();
      if (gen !== loadGenRef.current) {
        return;
      }
      if (!isAuthenticatedRef.current) {
        return;
      }
      applyRows(rows);
    } catch (err) {
      if (gen !== loadGenRef.current) {
        return;
      }
      if (!isAuthenticatedRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load library';
      applyEmpty('error', message);
    }
  }, [applyEmpty, applyRows]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Invalidate any in-flight signed-in fetch, then clear.
      loadGenRef.current += 1;
      applyEmpty('ready', null);
      return;
    }
    void load();
  }, [isAuthenticated, load, applyEmpty]);

  // Keep planLabel in stats when only the label changes (no re-fetch)
  useEffect(() => {
    setStats((prev) => (prev.planLabel === planLabel ? prev : { ...prev, planLabel }));
  }, [planLabel]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  // Guest: initial state is already ready+empty; load() never calls fetch.
  return {
    status: isAuthenticated ? status : 'ready',
    isGuest: !isAuthenticated,
    highlights: isAuthenticated ? highlights : [],
    domains: isAuthenticated ? domains : [],
    stats: isAuthenticated ? stats : emptyStats(planLabel),
    recent: isAuthenticated ? recent : [],
    currentPage: isAuthenticated ? currentPage : null,
    error: isAuthenticated ? error : null,
    refresh,
  };
}
