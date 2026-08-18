/**
 * Context-aware highlights by domain hook
 * Uses dynamic import to load the appropriate hook based on runtime context
 * Always calls useState/useEffect in the same order
 *
 * Module session memory: remounting the same domain paints last rows without a loading wipe.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import { fetchHighlightLabelsWeb, mergeLabelsForHighlight } from '@/shared/services/tag-query-web';
import { compareByHighlightActivityDesc } from '@/shared/utils/highlight-activity';
import { getSectionPath } from '@/shared/utils/normalize-page-url';

import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

export interface Highlight {
  id: string;
  url: string;
  text: string;
  path: string;
  createdAt: Date;
  updatedAt?: Date;
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
}

interface HighlightsResult {
  highlights: Highlight[];
  isLoading: boolean;
  error: Error | null;
}

/** Check if running in Chrome extension context */
function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    chrome.runtime.id !== undefined
  );
}

const EMPTY_HIGHLIGHTS_RESULT: HighlightsResult = {
  highlights: [],
  isLoading: false,
  error: null,
};

type SessionKey = string;

const sessionByKey = new Map<SessionKey, Highlight[]>();

function sessionKey(
  domain: string,
  isAuthenticated: boolean,
  context: 'extension' | 'web',
): SessionKey {
  return `${context}:${domain}:${isAuthenticated ? 'auth' : 'guest'}`;
}

export function clearHighlightsByDomainSessionMemory(): void {
  sessionByKey.clear();
}

/**
 * Unified hook for highlights by domain that works in both extension and web contexts.
 * Uses chrome.runtime for extension, Supabase directly for web.
 */
export function useHighlightsByDomain(
  domain: string | undefined,
  isAuthenticated = true,
): HighlightsResult {
  const context = isExtensionContext() ? 'extension' : 'web';
  const bootKey =
    domain && isAuthenticated
      ? sessionKey(domain, isAuthenticated, context)
      : null;
  const warm = bootKey ? sessionByKey.get(bootKey) : undefined;

  const [result, setResult] = useState<HighlightsResult>(() => {
    if (!domain || !isAuthenticated) return EMPTY_HIGHLIGHTS_RESULT;
    if (warm) {
      return { highlights: warm, isLoading: false, error: null };
    }
    return { highlights: [], isLoading: true, error: null };
  });

  const getHighlightsAction = useIpcAction<
    { domain: string },
    {
      highlights: Array<{
        id: string;
        url: string;
        text: string;
        path?: string;
        createdAt: string;
        updatedAt?: string;
        notes?: string;
        tags?: string[];
        sourceKind?: 'code';
        language?: string;
        presentation?: HighlightPresentation;
      }>;
    }
  >('GET_HIGHLIGHTS_BY_DOMAIN');
  const getHighlightsActionRef = useRef(getHighlightsAction);
  getHighlightsActionRef.current = getHighlightsAction;

  const domainRef = useRef(domain);
  domainRef.current = domain;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const genRef = useRef(0);

  const fetchHighlights = useCallback(
    async (opts?: { silent?: boolean }) => {
      const activeDomain = domainRef.current;
      const auth = authRef.current;

      if (!activeDomain) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
        return;
      }

      if (!auth) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
        return;
      }

      const activeKey = sessionKey(activeDomain, auth, context);
      const hasWarm = sessionByKey.has(activeKey);
      const silent = opts?.silent === true || hasWarm;

      if (!silent) {
        setResult((prev) => ({ ...prev, isLoading: true, error: null }));
      } else {
        setResult((prev) => ({ ...prev, error: null }));
      }

      const gen = ++genRef.current;

      try {
        let highlights: Highlight[];

        if (context === 'extension') {
          const ipcResult = await getHighlightsActionRef.current({ domain: activeDomain });

          if (!ipcResult.success) {
            throw new Error(ipcResult.error || 'Failed to fetch highlights');
          }

          highlights = (ipcResult.data.highlights || [])
            .map((hl) => ({
              id: hl.id,
              url: hl.url,
              text: hl.text,
              path: hl.path || getSectionPath(hl.url),
              createdAt: new Date(hl.createdAt),
              updatedAt: hl.updatedAt ? new Date(hl.updatedAt) : undefined,
              notes: hl.notes,
              tags: hl.tags,
              sourceKind: hl.sourceKind,
              language: hl.language,
              presentation: hl.presentation,
            }))
            .sort(compareByHighlightActivityDesc);
        } else {
          const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
          const supabase = getWebSupabaseClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            if (gen !== genRef.current) return;
            setResult(EMPTY_HIGHLIGHTS_RESULT);
            return;
          }

          const { data, error: queryError } = await supabase
            .from('highlights')
            .select('id, url, text, metadata, created_at, updated_at')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .ilike('url', `%${activeDomain}%`);

          if (queryError) throw queryError;

          const highlightIds = (data || []).map((hl) => hl.id);
          const labelMap = await fetchHighlightLabelsWeb(
            supabase,
            session.user.id,
            highlightIds,
          );

          highlights = (data || [])
            .map((hl) => {
              const metadata = hl.metadata as {
                notes?: string;
                tags?: string[];
                sourceKind?: 'code';
                language?: string;
                presentation?: HighlightPresentation;
              } | null;
              return {
                id: hl.id,
                url: hl.url,
                text: hl.text,
                path: getSectionPath(hl.url),
                createdAt: new Date(hl.created_at),
                updatedAt: hl.updated_at ? new Date(hl.updated_at) : undefined,
                notes: metadata?.notes,
                tags: mergeLabelsForHighlight(labelMap.get(hl.id), metadata?.tags),
                sourceKind: metadata?.sourceKind,
                language: metadata?.language,
                presentation: metadata?.presentation,
              };
            })
            .sort(compareByHighlightActivityDesc);
        }

        if (gen !== genRef.current) return;
        if (domainRef.current !== activeDomain || authRef.current !== auth) return;

        sessionByKey.set(activeKey, highlights);
        setResult({
          highlights,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (gen !== genRef.current) return;
        if (domainRef.current !== activeDomain || authRef.current !== auth) return;

        const error = err instanceof Error ? err : new Error('Failed to fetch highlights');
        if (hasWarm) {
          setResult((prev) => ({
            ...prev,
            isLoading: false,
            error,
          }));
          return;
        }
        setResult({
          highlights: [],
          isLoading: false,
          error,
        });
      }
    },
    [context],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthenticated || !domain) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
        return;
      }

      const activeKey = sessionKey(domain, isAuthenticated, context);
      const cached = sessionByKey.get(activeKey);
      if (cached) {
        setResult({ highlights: cached, isLoading: false, error: null });
        await fetchHighlights({ silent: true });
      } else {
        await fetchHighlights({ silent: false });
      }
      if (cancelled) return;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchHighlights, isAuthenticated, domain, context]);

  useEffect(() => {
    if (!isAuthenticated) {
      for (const k of [...sessionByKey.keys()]) {
        if (k.endsWith(':auth')) sessionByKey.delete(k);
      }
      setResult(EMPTY_HIGHLIGHTS_RESULT);
    }
  }, [isAuthenticated]);

  useLibraryDataChanged(() => {
    void (async () => {
      if (!authRef.current) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
        return;
      }
      await fetchHighlights({ silent: true });
    })();
  });

  return result;
}
