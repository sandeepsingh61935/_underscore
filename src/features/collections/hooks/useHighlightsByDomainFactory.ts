/**
 * Context-aware highlights by domain hook
 * Uses dynamic import to load the appropriate hook based on runtime context
 * Always calls useState/useEffect in the same order
 */

import { useState, useEffect, useCallback } from 'react';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import { fetchHighlightLabelsWeb, mergeLabelsForHighlight } from '@/shared/services/tag-query-web';
import { compareByHighlightActivityDesc } from '@/shared/utils/highlight-activity';

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
    return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && chrome.runtime.id !== undefined;
}

const EMPTY_HIGHLIGHTS_RESULT: HighlightsResult = {
  highlights: [],
  isLoading: false,
  error: null,
};

/**
 * Unified hook for highlights by domain that works in both extension and web contexts.
 * Uses chrome.runtime for extension, Supabase directly for web.
 */
export function useHighlightsByDomain(
  domain: string | undefined,
  isAuthenticated = true,
): HighlightsResult {
    const [result, setResult] = useState<HighlightsResult>({
        highlights: [],
        isLoading: true,
        error: null,
    });

    const context = isExtensionContext() ? 'extension' : 'web';

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

  const fetchHighlights = useCallback(async () => {
    if (!domain) {
      setResult(EMPTY_HIGHLIGHTS_RESULT);
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (context === 'extension') {
        const ipcResult = await getHighlightsAction({ domain });

        if (!ipcResult.success) {
          throw new Error(ipcResult.error || 'Failed to fetch highlights');
        }

        const highlights: Highlight[] = (ipcResult.data.highlights || [])
          .map((hl) => ({
            id: hl.id,
            url: hl.url,
            text: hl.text,
            path: hl.path || new URL(hl.url).pathname,
            createdAt: new Date(hl.createdAt),
            updatedAt: hl.updatedAt ? new Date(hl.updatedAt) : undefined,
            notes: hl.notes,
            tags: hl.tags,
            sourceKind: hl.sourceKind,
            language: hl.language,
            presentation: hl.presentation,
          }))
          .sort(compareByHighlightActivityDesc);

        setResult({
          highlights,
          isLoading: false,
          error: null,
        });
      } else {
        const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
        const supabase = getWebSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setResult(EMPTY_HIGHLIGHTS_RESULT);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('highlights')
          .select('id, url, text, metadata, created_at, updated_at')
          .eq('user_id', session.user.id)
          .is('deleted_at', null)
          .ilike('url', `%${domain}%`);

        if (queryError) throw queryError;

        const highlightIds = (data || []).map((hl) => hl.id);
        const labelMap = await fetchHighlightLabelsWeb(supabase, session.user.id, highlightIds);

        const highlights: Highlight[] = (data || []).map((hl) => {
          const highlightUrl = new URL(hl.url);
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
            path: highlightUrl.pathname,
            createdAt: new Date(hl.created_at),
            updatedAt: hl.updated_at ? new Date(hl.updated_at) : undefined,
            notes: metadata?.notes,
            tags: mergeLabelsForHighlight(labelMap.get(hl.id), metadata?.tags),
            sourceKind: metadata?.sourceKind,
            language: metadata?.language,
            presentation: metadata?.presentation,
          };
        }).sort(compareByHighlightActivityDesc);

        setResult({ highlights, isLoading: false, error: null });
      }
    } catch (err) {
      setResult({
        highlights: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch highlights'),
      });
    }
  }, [domain, context, getHighlightsAction]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthenticated) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
      }

      await fetchHighlights();
      if (cancelled) return;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchHighlights, isAuthenticated]);

  useLibraryDataChanged(() => {
    void (async () => {
      if (!isAuthenticated) {
        setResult(EMPTY_HIGHLIGHTS_RESULT);
      }
      await fetchHighlights();
    })();
  });

    return result;
}
