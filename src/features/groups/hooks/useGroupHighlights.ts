/**
 * @file useGroupHighlights.ts
 * @description Highlights for a group's distinct domains, merged across the
 * existing GET_HIGHLIGHTS_BY_DOMAIN channel (one IPC call per hostname).
 * Callers filter by `resolveGroupPages` output. Safe empty fallback outside
 * the extension context.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import type { Highlight } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { hasChromeRuntime, useIpcAction } from '@/shared/hooks/useIpcAction';
import type { PageGroupItem } from '@/shared/types/page-group';
import { getSectionPath } from '@/shared/utils/normalize-page-url';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

interface DomainHighlightsResponse {
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

function distinctHostnames(items: PageGroupItem[]): string[] {
  const hosts = new Set<string>();
  for (const item of items) {
    if (item.deletedAt !== null) continue;
    if (item.kind === 'domain') {
      hosts.add(item.hostname.trim().toLowerCase());
      continue;
    }
    try {
      const host = new URL(item.urlNormalized).hostname.toLowerCase();
      if (host) hosts.add(host);
    } catch {
      // ignore unparseable page URLs
    }
  }
  return [...hosts];
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export interface GroupHighlightsResult {
  highlights: Array<Highlight & { domain: string }>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGroupHighlights(
  items: PageGroupItem[],
  isAuthenticated = true
): GroupHighlightsResult {
  const [highlights, setHighlights] = useState<Array<Highlight & { domain: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getHighlightsAction = useIpcAction<{ domain: string }, DomainHighlightsResponse>(
    'GET_HIGHLIGHTS_BY_DOMAIN'
  );
  const actionRef = useRef(getHighlightsAction);
  actionRef.current = getHighlightsAction;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const genRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const liveItems = itemsRef.current;
    if (!hasChromeRuntime()) {
      setHighlights([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    const hosts = distinctHostnames(liveItems);
    if (hosts.length === 0) {
      setHighlights([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const gen = ++genRef.current;
    try {
      const seen = new Map<string, Highlight & { domain: string }>();
      for (const host of hosts) {
        const result = await actionRef.current({ domain: host });
        if (!result.success) throw new Error(result.error || 'Failed to fetch highlights');
        for (const hl of result.data.highlights ?? []) {
          if (seen.has(hl.id)) continue;
          seen.set(hl.id, {
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
            domain: hostnameOf(hl.url) || host,
          });
        }
      }
      if (gen !== genRef.current) return;
      setHighlights([...seen.values()]);
    } catch (err) {
      if (gen !== genRef.current) return;
      setHighlights([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch highlights'));
    } finally {
      if (gen === genRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, items, isAuthenticated]);

  useLibraryDataChanged(
    useCallback(() => {
      void fetchAll();
    }, [fetchAll])
  );

  return { highlights, isLoading, error, refetch: fetchAll };
}
