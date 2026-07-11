/**
 * Context-aware collections hook
 * Uses dynamic import to load the appropriate hook based on runtime context
 * Always calls useState/useEffect in the same order
 */

import { useState, useEffect } from 'react';
import type { DomainCollection } from '@/shared/types/domain-collection';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

interface CollectionsResult {
    collections: DomainCollection[];
    isLoading: boolean;
    error: Error | null;
}

/** Check if running in Chrome extension context */
function isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && chrome.runtime.id !== undefined;
}

/**
 * Unified hook for collections that works in both extension and web contexts.
 * Uses chrome.runtime for extension, Supabase directly for web.
 */
export function useCollections(): CollectionsResult {
    const [result, setResult] = useState<CollectionsResult>({
        collections: [],
        isLoading: true,
        error: null,
    });

    const context = isExtensionContext() ? 'extension' : 'web';

    const getCollectionsAction = useIpcAction<void, { collections: Array<{ id: string; domain: string; highlightCount: number; lastActive: string }> }>('GET_COLLECTIONS');

    useEffect(() => {
        let cancelled = false;

        const fetchCollections = async () => {
            try {
                if (context === 'extension') {
                    // Extension context - use IMessageBus via useIpcAction
                    const ipcResult = await getCollectionsAction(undefined);

                    if (cancelled) return;

                    if (!ipcResult.success) {
                        throw new Error(ipcResult.error || 'Failed to fetch collections');
                    }

                    const collections = (ipcResult.data.collections || []).map((col) => ({
                        id: col.id,
                        domain: col.domain,
                        highlightCount: col.highlightCount,
                        lastActive: new Date(col.lastActive),
                    }));

                    setResult({ collections, isLoading: false, error: null });
                } else {
                    const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
                    const supabase = getWebSupabaseClient();
                    const { data: { session } } = await supabase.auth.getSession();

                    if (cancelled) return;

                    if (!session?.user) {
                        setResult({ collections: [], isLoading: false, error: null });
                        return;
                    }

                    const { data, error: queryError } = await supabase
                        .from('highlights')
                        .select('url, created_at, updated_at')
                        .eq('user_id', session.user.id)
                        .is('deleted_at', null);

                    if (cancelled) return;

                    if (queryError) throw queryError;

                    // Group by domain
                    const domainMap = new Map<string, { count: number; lastActive: number }>();

                    for (const hl of data || []) {
                        try {
                            const url = new URL(hl.url);
                            const domain = url.hostname.replace(/^www\./, '');
                            const hlTime = new Date(hl.updated_at || hl.created_at).getTime();

                            const existing = domainMap.get(domain);
                            if (existing) {
                                existing.count += 1;
                                existing.lastActive = Math.max(existing.lastActive, hlTime);
                            } else {
                                domainMap.set(domain, { count: 1, lastActive: hlTime });
                            }
                        } catch {
                            // Skip invalid URLs
                        }
                    }

                    const collections: DomainCollection[] = Array.from(domainMap.entries())
                        .map(([domain, data], index) => ({
                            id: String(index + 1),
                            domain,
                            highlightCount: data.count,
                            lastActive: new Date(data.lastActive),
                        }))
                        .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

                    setResult({ collections, isLoading: false, error: null });
                }
            } catch (err) {
                if (cancelled) return;
                setResult({
                    collections: [],
                    isLoading: false,
                    error: err instanceof Error ? err : new Error('Failed to fetch collections'),
                });
            }
        };

        fetchCollections();

        return () => {
            cancelled = true;
        };
    }, [context, getCollectionsAction]);

    return result;
}
