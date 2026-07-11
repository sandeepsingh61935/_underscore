/**
 * Context-aware highlights by domain hook
 * Uses dynamic import to load the appropriate hook based on runtime context
 * Always calls useState/useEffect in the same order
 */

import { useState, useEffect, useCallback } from 'react';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
    notes?: string;
    tags?: string[];
    decryptionStatus?: 'vault_locked' | 'failed';
}

interface HighlightsResult {
    highlights: Highlight[];
    isLoading: boolean;
    error: Error | null;
    vaultLocked: boolean;
}

/** Check if running in Chrome extension context */
function isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && chrome.runtime.id !== undefined;
}

/**
 * Unified hook for highlights by domain that works in both extension and web contexts.
 * Uses chrome.runtime for extension, Supabase directly for web.
 */
export function useHighlightsByDomain(domain: string | undefined): HighlightsResult {
    const [result, setResult] = useState<HighlightsResult>({
        highlights: [],
        isLoading: true,
        error: null,
        vaultLocked: false,
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
          notes?: string;
          tags?: string[];
          decryptionStatus?: 'vault_locked' | 'failed';
        }>;
        vaultLocked?: boolean;
      }
    >('GET_HIGHLIGHTS_BY_DOMAIN');

  const fetchHighlights = useCallback(async () => {
    if (!domain) {
      setResult({ highlights: [], isLoading: false, error: null, vaultLocked: false });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (context === 'extension') {
        const ipcResult = await getHighlightsAction({ domain });

        if (!ipcResult.success) {
          throw new Error(ipcResult.error || 'Failed to fetch highlights');
        }

        const highlights: Highlight[] = (ipcResult.data.highlights || []).map((hl) => ({
          id: hl.id,
          url: hl.url,
          text: hl.text,
          path: hl.path || new URL(hl.url).pathname,
          createdAt: new Date(hl.createdAt),
          notes: hl.notes,
          tags: hl.tags,
          decryptionStatus: hl.decryptionStatus,
        }));

        setResult({
          highlights,
          isLoading: false,
          error: null,
          vaultLocked: ipcResult.data.vaultLocked ?? false,
        });
      } else {
        const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
        const supabase = getWebSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setResult({ highlights: [], isLoading: false, error: null, vaultLocked: false });
          return;
        }

        const { data, error: queryError } = await supabase
          .from('highlights')
          .select('id, url, text, metadata, created_at, updated_at')
          .eq('user_id', session.user.id)
          .is('deleted_at', null)
          .ilike('url', `%${domain}%`);

        if (queryError) throw queryError;

        const highlights: Highlight[] = (data || []).map((hl) => {
          const highlightUrl = new URL(hl.url);
          const metadata = hl.metadata as { notes?: string; tags?: string[] } | null;
          return {
            id: hl.id,
            url: hl.url,
            text: hl.text,
            path: highlightUrl.pathname,
            createdAt: new Date(hl.created_at),
            notes: metadata?.notes,
            tags: metadata?.tags,
          };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setResult({ highlights, isLoading: false, error: null, vaultLocked: false });
      }
    } catch (err) {
      setResult({
        highlights: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch highlights'),
        vaultLocked: false,
      });
    }
  }, [domain, context, getHighlightsAction]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await fetchHighlights();
      if (cancelled) return;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchHighlights]);

  useLibraryDataChanged(() => {
    void fetchHighlights();
  });

    return result;
}
