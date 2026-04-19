import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

export interface DomainCollection {
    id: string;
    domain: string;
    highlightCount: number;
    lastActive: Date;
}

/** Create Supabase client for web app */
function createSupabaseClient(): SupabaseClient | null {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.warn('[useCollectionsWeb] Supabase env vars not configured');
        return null;
    }

    return createClient(url, anonKey);
}

/** Hook for web app - fetches collections from Supabase directly */
export function useCollectionsWeb() {
    const [collections, setCollections] = useState<DomainCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const supabase = createSupabaseClient();

                if (!supabase) {
                    // No Supabase config - return empty (user not authenticated or not configured)
                    setCollections([]);
                    setIsLoading(false);
                    return;
                }

                // Get current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session?.user) {
                    setCollections([]);
                    setIsLoading(false);
                    return;
                }

                // Fetch highlights grouped by domain
                const { data, error: queryError } = await supabase
                    .from('highlights')
                    .select('url, created_at, updated_at')
                    .eq('user_id', session.user.id)
                    .is('deleted_at', null);

                if (queryError) {
                    throw queryError;
                }

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

                // Map to array
                const collections: DomainCollection[] = Array.from(domainMap.entries())
                    .map(([domain, data], index) => ({
                        id: String(index + 1),
                        domain,
                        highlightCount: data.count,
                        lastActive: new Date(data.lastActive),
                    }))
                    .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

                setCollections(collections);
            } catch (err) {
                console.error('[useCollectionsWeb] Error:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch collections'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollections();
    }, []);

    return { collections, isLoading, error };
}
