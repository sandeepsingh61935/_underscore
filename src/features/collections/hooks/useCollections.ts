import { useState, useEffect } from 'react';

export interface DomainCollection {
  id: string;
  domain: string;
  highlightCount: number;
  lastActive: Date;
}

interface CollectionsResult {
  collections: DomainCollection[];
  isLoading: boolean;
  error: Error | null;
  isWebContext: boolean;
}

interface RawHighlight {
  url: string;
  created_at: string;
  updated_at: string | null;
}

function groupByDomain(rows: RawHighlight[]): DomainCollection[] {
  const domainMap = new Map<string, { count: number; lastActive: number }>();
  for (const hl of rows) {
    let domain: string;
    let t: number;
    try {
      const parsed = new URL(hl.url);
      domain = parsed.hostname.replace(/^www\./, '');
      t = new Date(hl.updated_at || hl.created_at).getTime();
    } catch {
      continue; // skip invalid URLs
    }
    const existing = domainMap.get(domain);
    if (existing) {
      existing.count += 1;
      existing.lastActive = Math.max(existing.lastActive, t);
    } else {
      domainMap.set(domain, { count: 1, lastActive: t });
    }
  }
  return Array.from(domainMap.entries())
    .map(([domain, d], i) => ({
      id: String(i + 1),
      domain,
      highlightCount: d.count,
      lastActive: new Date(d.lastActive),
    }))
    .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
}

function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    chrome.runtime.id !== undefined
  );
}

export function useCollections(): CollectionsResult {
  const [result, setResult] = useState<CollectionsResult>({
    collections: [],
    isLoading: true,
    error: null,
    isWebContext: !isExtensionContext(),
  });

  useEffect(() => {
    let cancelled = false;

    const fetch = async (): Promise<void> => {
      try {
        if (isExtensionContext()) {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_COLLECTIONS',
            timestamp: Date.now(),
          });

          if (cancelled) return;

          if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to fetch collections');
          }

          const collections: DomainCollection[] = (response.data.collections || []).map(
            (col: { id: string; domain: string; highlightCount: number; lastActive: string | Date }) => ({
              id: col.id,
              domain: col.domain,
              highlightCount: col.highlightCount,
              lastActive: new Date(col.lastActive),
            })
          );

          setResult({ collections, isLoading: false, error: null, isWebContext: false });
        } else {
          // Web SPA: query Supabase directly for Vault data
          const { createClient } = await import('@supabase/supabase-js');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const meta = import.meta as any;
          const url = meta.env?.VITE_SUPABASE_URL as string | undefined;
          const anonKey = meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

          if (!url || !anonKey) {
            if (!cancelled) setResult({ collections: [], isLoading: false, error: null, isWebContext: true });
            return;
          }

          const supabase = createClient(url, anonKey);
          const { data: { session } } = await supabase.auth.getSession();

          if (cancelled) return;

          if (!session?.user) {
            setResult({ collections: [], isLoading: false, error: null, isWebContext: true });
            return;
          }

          const { data, error: queryError } = await supabase
            .from('highlights')
            .select('url, created_at, updated_at')
            .eq('user_id', session.user.id)
            .is('deleted_at', null);

          if (cancelled) return;
          if (queryError) throw queryError;

          const collections = groupByDomain(data ?? []);

          setResult({ collections, isLoading: false, error: null, isWebContext: true });
        }
      } catch (err) {
        if (cancelled) return;
        setResult({
          collections: [],
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to fetch collections'),
          isWebContext: !isExtensionContext(),
        });
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return result;
}
