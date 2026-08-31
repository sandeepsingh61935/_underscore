/**
 * @file useHighlightSearch.ts
 * @description Context-aware highlight search hook.
 *
 * Mirrors the extension/web split used by `useHighlightsByDomainFactory.ts`:
 *  - Extension context: `SEARCH_HIGHLIGHTS` IPC to the background, which runs
 *    `HighlightQueryService.search` over the cached repository.
 *  - Web context: fetch all of the user's highlights from Supabase and run
 *    the same shared `searchHighlights` util client-side, applying the same
 *    domain/section scope filtering the background handler applies.
 *
 * Debouncing is intentionally NOT handled here — that is the
 * `HighlightSearchBar` component's responsibility. This hook simply reacts
 * to whatever `query` value it is given.
 */

import { useCallback, useEffect, useState } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import {
  fetchHighlightLabelsWeb,
  mergeLabelsForHighlight,
} from '@/shared/services/tag-query-web';
import { getDomainFromUrl, urlMatchesDomain } from '@/shared/utils/domain-from-url';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import type { SearchField, SearchableHighlight } from '@/shared/utils/highlight-search';
import { searchHighlights } from '@/shared/utils/highlight-search';
import { getSectionPath } from '@/shared/utils/normalize-page-url';
import { getSectionKey } from '@/shared/utils/section-key';

export type SearchScope =
  | { kind: 'library' }
  | { kind: 'domain'; domain: string }
  | { kind: 'section'; domain: string; section: string };

export interface HighlightSearchResult {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  createdAt: Date;
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
  matchedFields: SearchField[];
}

export interface UseHighlightSearchOptions {
  query: string;
  scope: SearchScope;
  fields?: SearchField[];
}

interface HighlightSearchState {
  results: HighlightSearchResult[];
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_STATE: HighlightSearchState = {
  results: [],
  isLoading: false,
  error: null,
};

/** Check if running in Chrome extension context (mirrors useHighlightsByDomainFactory.ts). */
function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    chrome.runtime.id !== undefined
  );
}

/** Translate a `SearchScope` into the domain/section filter the IPC/query-service pair understands. */
function scopeToFilters(scope: SearchScope): { domain?: string; section?: string } {
  switch (scope.kind) {
    case 'library':
      return {};
    case 'domain':
      return { domain: scope.domain };
    case 'section':
      return { domain: scope.domain, section: scope.section };
  }
}

interface SearchHighlightsIpcResponse {
  highlights: Array<{
    id: string;
    text: string;
    url: string;
    path: string;
    domain: string;
    createdAt: string;
    notes?: string;
    tags?: string[];
    sourceKind?: 'code';
    language?: string;
    presentation?: HighlightPresentation;
    matchedFields: SearchField[];
  }>;
}

/** Web-path row shape: SearchableHighlight plus the extra fields the result needs. */
interface WebSearchableHighlight extends SearchableHighlight {
  domain: string;
  path: string;
  createdAt: Date;
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
}

/**
 * Unified highlight search hook that works in both extension and web contexts.
 * Uses `chrome.runtime` IPC for the extension, Supabase directly for the web app.
 *
 * Empty/whitespace `query` short-circuits to an empty, non-loading result —
 * this lets call sites fall back to their normal (unfiltered) list for free.
 */
export function useHighlightSearch(options: UseHighlightSearchOptions): {
  results: HighlightSearchResult[];
  isLoading: boolean;
  error: Error | null;
} {
  const { query, scope, fields } = options;
  const [state, setState] = useState<HighlightSearchState>(EMPTY_STATE);

  const context = isExtensionContext() ? 'extension' : 'web';

  // Stable value-comparison keys: `scope`/`fields` are frequently re-created
  // by callers on every render, so we key the callback's identity off their
  // serialized value rather than reference.
  const scopeKey = JSON.stringify(scope);
  const fieldsKey = fields ? JSON.stringify(fields) : '';

  const searchAction = useIpcAction<
    { query: string; domain?: string; section?: string; fields?: SearchField[] },
    SearchHighlightsIpcResponse
  >('SEARCH_HIGHLIGHTS');

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState(EMPTY_STATE);
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (context === 'extension') {
        const filters = scopeToFilters(scope);
        const ipcResult = await searchAction({ query: trimmed, ...filters, fields });

        if (!ipcResult.success) {
          throw new Error(ipcResult.error || 'Failed to search highlights');
        }

        const results: HighlightSearchResult[] = (ipcResult.data.highlights || []).map(
          (hl) => ({
            id: hl.id,
            text: hl.text,
            url: hl.url,
            path: hl.path,
            domain: hl.domain,
            createdAt: new Date(hl.createdAt),
            notes: hl.notes,
            tags: hl.tags,
            sourceKind: hl.sourceKind,
            language: hl.language,
            presentation: hl.presentation,
            matchedFields: hl.matchedFields,
          })
        );

        setState({ results, isLoading: false, error: null });
      } else {
        const { getWebSupabaseClient } =
          await import('@/shared/auth/supabase-web-client');
        const supabase = getWebSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setState(EMPTY_STATE);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('highlights')
          .select('id, url, text, metadata, created_at')
          .eq('user_id', session.user.id)
          .is('deleted_at', null);

        if (queryError) throw queryError;

        const highlightIds = (data || []).map((hl) => hl.id);
        const labelMap = await fetchHighlightLabelsWeb(
          supabase,
          session.user.id,
          highlightIds
        );

        const rows: WebSearchableHighlight[] = [];
        for (const hl of data || []) {
          if (!hl.url) continue;

          const domain = getDomainFromUrl(hl.url);
          if (!domain) continue;

          const path = getSectionPath(hl.url);

          if (scope.kind === 'domain' || scope.kind === 'section') {
            if (!urlMatchesDomain(hl.url, scope.domain)) continue;
          }
          if (
            scope.kind === 'section' &&
            getSectionKey({ url: hl.url, path }) !== scope.section
          ) {
            continue;
          }

          const metadata = hl.metadata as {
            notes?: string;
            tags?: string[];
            sourceKind?: 'code';
            language?: string;
            presentation?: HighlightPresentation;
          } | null;
          rows.push({
            id: hl.id,
            url: hl.url,
            text: hl.text,
            notes: metadata?.notes,
            tags: mergeLabelsForHighlight(labelMap.get(hl.id), metadata?.tags),
            domain,
            path,
            createdAt: new Date(hl.created_at),
            sourceKind: metadata?.sourceKind,
            language: metadata?.language,
            presentation: metadata?.presentation,
          });
        }

        const matches = searchHighlights(rows, trimmed, fields);
        const results: HighlightSearchResult[] = matches.map((m) => ({
          id: m.highlight.id,
          text: m.highlight.text,
          url: m.highlight.url,
          path: m.highlight.path,
          domain: m.highlight.domain,
          createdAt: m.highlight.createdAt,
          notes: m.highlight.notes,
          tags: m.highlight.tags,
          sourceKind: m.highlight.sourceKind,
          language: m.highlight.language,
          presentation: m.highlight.presentation,
          matchedFields: m.matchedFields,
        }));

        setState({ results, isLoading: false, error: null });
      }
    } catch (err) {
      setState({
        results: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to search highlights'),
      });
    }
    // scope/fields are captured by value via scopeKey/fieldsKey below; the
    // callback identity (and therefore the effect) only changes when those
    // serialized values change, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scopeKey, fieldsKey, context, searchAction]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await runSearch();
      if (cancelled) return;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [runSearch]);

  return state;
}
