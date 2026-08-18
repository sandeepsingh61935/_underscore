/**
 * @file useWebLibrary.ts
 * @description Web library data hook: Supabase (or injected) fetch + pure aggregation.
 * Session memory + IDB hydrate before network so route changes and reloads paint fast.
 * Never uses extension runtime messaging or MessageBus.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { fetchHighlightLabelsWeb } from '@/shared/services/tag-query-web';
import { getDomainFromUrl } from '@/shared/utils/domain-from-url';
import {
  mapCloudBodyText,
  resolveCloudHighlightTags,
} from '@/shared/library/cloud-highlight-mapper';
import { getSectionPath } from '@/shared/utils/normalize-page-url';
import { highlightTimestampMs } from '@/shared/utils/supabase-highlight-row';
import { readWebLibraryCache, writeWebLibraryCache } from '@/web/lib/web-library-cache';
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

export type WebHighlightPatch = {
  note?: string;
  tags?: string[];
};

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
  /** Optimistically patch a highlight in local aggregate (after note/tag save). */
  patchHighlight: (id: string, patch: WebHighlightPatch) => void;
};

export type UseWebLibraryOpts = {
  isAuthenticated: boolean;
  planLabel: string;
  /** Inject for tests; production default queries Supabase highlights. */
  fetchHighlights?: () => Promise<WebHighlight[]>;
};

/** Skip network when session memory is fresher than this (ms). */
const SESSION_STALE_MS = 60_000;

/** Memory key when fetch is injected (tests / no Supabase session). */
const INJECTED_CACHE_KEY = '__injected__';

type SessionSnapshot = {
  key: string;
  highlights: WebHighlight[];
  savedAt: number;
};

/** Survives route unmount within the SPA JS heap. */
let sessionSnapshot: SessionSnapshot | null = null;

/** Test helper: drop in-memory library snapshot between cases. */
export function clearWebLibrarySessionMemory(): void {
  sessionSnapshot = null;
}

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
  if (row.deleted_at !== null && row.deleted_at !== undefined && row.deleted_at !== '') {
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

  const path = getSectionPath(url);

  const metadata = row.metadata ?? undefined;
  const tags = resolveCloudHighlightTags(undefined, metadata?.tags);
  const note = typeof metadata?.notes === 'string' ? metadata.notes : '';
  const body = mapCloudBodyText({ text: row.text });

  return {
    id: row.id,
    domain,
    path,
    quote: body.text,
    note,
    tags,
    savedAt: highlightTimestampMs(row.updated_at, row.created_at),
  };
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = getWebSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
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

  // Merge junction-table labels so tags written only to highlight_tags still show.
  try {
    const labels = await fetchHighlightLabelsWeb(
      supabase,
      session.user.id,
      out.map((h) => h.id),
    );
    for (const h of out) {
      const junction = labels.get(h.id);
      h.tags = resolveCloudHighlightTags(junction, h.tags);
    }
  } catch {
    // Non-fatal: metadata.tags still available if junction query fails.
  }

  await writeWebLibraryCache(session.user.id, out);
  return out;
}

function rememberSession(key: string, highlights: WebHighlight[]): void {
  sessionSnapshot = { key, highlights, savedAt: Date.now() };
}

function readSession(key: string): SessionSnapshot | null {
  if (sessionSnapshot?.key === key) return sessionSnapshot;
  return null;
}

/**
 * Library data for the web product shell.
 * Guest is always empty (no seed). Signed-in uses injected fetch or Supabase.
 *
 * Load order: session memory → IDB → network. Warm data paints as ready;
 * network revalidates without wiping. In-flight work is generation-gated.
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

  // Optimistic paint from SPA session memory (survives route unmount).
  const boot = isAuthenticated && sessionSnapshot ? sessionSnapshot : null;
  const bootAgg = boot ? aggregateLibrary(boot.highlights) : null;

  const [status, setStatus] = useState<WebLibraryState['status']>(() =>
    !isAuthenticated ? 'ready' : boot ? 'ready' : 'loading',
  );
  const [highlights, setHighlights] = useState<WebHighlight[]>(() => boot?.highlights ?? []);
  const [domains, setDomains] = useState<WebDomainNode[]>(() => bootAgg?.domains ?? []);
  const [stats, setStats] = useState<WebLibraryStats>(() =>
    bootAgg
      ? { ...bootAgg.stats, planLabel }
      : emptyStats(planLabel),
  );
  const [recent, setRecent] = useState<WebHighlight[]>(() => bootAgg?.recent ?? []);
  const [currentPage, setCurrentPage] = useState<WebCurrentPage>(() => bootAgg?.currentPage ?? null);
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

  const load = useCallback(
    async (loadOpts?: { force?: boolean }) => {
      const force = loadOpts?.force === true;

      if (!isAuthenticatedRef.current) {
        loadGenRef.current += 1;
        sessionSnapshot = null;
        applyEmpty('ready', null);
        return;
      }

      const gen = ++loadGenRef.current;
      const injected = Boolean(fetchRef.current);
      let cacheKey: string;

      if (injected) {
        cacheKey = INJECTED_CACHE_KEY;
      } else {
        const userId = await getSessionUserId();
        if (gen !== loadGenRef.current) return;
        if (!isAuthenticatedRef.current) return;
        if (!userId) {
          sessionSnapshot = null;
          applyEmpty('ready', null);
          return;
        }
        // Drop foreign-user optimistic paint if session memory belonged to someone else.
        if (sessionSnapshot && sessionSnapshot.key !== userId) {
          sessionSnapshot = null;
        }
        cacheKey = userId;
      }

      let paintedWarm = false;

      const mem = readSession(cacheKey);
      if (mem) {
        applyRows(mem.highlights);
        paintedWarm = true;
        if (!force && Date.now() - mem.savedAt < SESSION_STALE_MS) {
          return;
        }
      } else if (!injected) {
        try {
          const cached = await readWebLibraryCache(cacheKey);
          if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
          if (cached?.highlights) {
            rememberSession(cacheKey, cached.highlights);
            applyRows(cached.highlights);
            paintedWarm = true;
          }
        } catch {
          // IDB optional
        }
      }

      if (!paintedWarm) {
        setHighlights([]);
        setDomains([]);
        setRecent([]);
        setCurrentPage(null);
        setError(null);
        setStats(emptyStats(planLabelRef.current));
        setStatus('loading');
      }

      try {
        const fetchFn = fetchRef.current ?? defaultFetchHighlights;
        const rows = await fetchFn();
        if (gen !== loadGenRef.current) return;
        if (!isAuthenticatedRef.current) return;
        rememberSession(cacheKey, rows);
        applyRows(rows);
      } catch (err) {
        if (gen !== loadGenRef.current) return;
        if (!isAuthenticatedRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load library';

        if (paintedWarm) {
          setError(message);
          setStatus('ready');
          return;
        }

        if (fetchRef.current) {
          applyEmpty('error', message);
          return;
        }

        try {
          const cached = await readWebLibraryCache(cacheKey);
          if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
          if (cached?.highlights) {
            rememberSession(cacheKey, cached.highlights);
            applyRows(cached.highlights);
            setError(message);
            return;
          }
        } catch {
          // fall through
        }
        applyEmpty('error', message);
      }
    },
    [applyEmpty, applyRows],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      loadGenRef.current += 1;
      sessionSnapshot = null;
      applyEmpty('ready', null);
      return;
    }
    void load({ force: false });
  }, [isAuthenticated, load, applyEmpty]);

  // Keep planLabel in stats when only the label changes (no re-fetch)
  useEffect(() => {
    setStats((prev) => (prev.planLabel === planLabel ? prev : { ...prev, planLabel }));
  }, [planLabel]);

  const refresh = useCallback(async () => {
    await load({ force: true });
  }, [load]);

  const patchHighlight = useCallback((id: string, patch: WebHighlightPatch) => {
    setHighlights((prev) => {
      const next = prev.map((h) => {
        if (h.id !== id) return h;
        return {
          ...h,
          ...(patch.note !== undefined ? { note: patch.note } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        };
      });
      const agg = aggregateLibrary(next);
      setDomains(agg.domains);
      setStats({ ...agg.stats, planLabel: planLabelRef.current });
      setRecent(agg.recent);
      setCurrentPage(agg.currentPage);
      if (sessionSnapshot) {
        sessionSnapshot = {
          ...sessionSnapshot,
          highlights: next,
        };
      }
      return next;
    });
  }, []);

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
    patchHighlight,
  };
}
