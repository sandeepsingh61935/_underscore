import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
}

/** Create Supabase client for web app */
function createSupabaseClient(): SupabaseClient | null {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.warn('[useHighlightsByDomainWeb] Supabase env vars not configured');
        return null;
    }

    return createClient(url, anonKey);
}

/** Hook for web app - fetches highlights by domain from Supabase */
export function useHighlightsByDomainWeb(domain: string | undefined) {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!domain) {
            setHighlights([]);
            setIsLoading(false);
            return;
        }

        const fetchHighlights = async () => {
            try {
                const supabase = createSupabaseClient();

                if (!supabase) {
                    setHighlights([]);
                    setIsLoading(false);
                    return;
                }

                // Get current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session?.user) {
                    setHighlights([]);
                    setIsLoading(false);
                    return;
                }

                // Fetch highlights where URL contains the domain
                const { data, error: queryError } = await supabase
                    .from('highlights')
                    .select('id, url, text, created_at, updated_at')
                    .eq('user_id', session.user.id)
                    .is('deleted_at', null)
                    .ilike('url', `%${domain}%`);

                if (queryError) {
                    throw queryError;
                }

                // Map to highlight format
                const highlights: Highlight[] = (data || []).map((hl) => {
                    const url = new URL(hl.url);
                    return {
                        id: hl.id,
                        url: hl.url,
                        text: hl.text,
                        path: url.pathname,
                        createdAt: new Date(hl.created_at),
                    };
                });

                // Sort by most recent
                highlights.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                setHighlights(highlights);
            } catch (err) {
                console.error('[useHighlightsByDomainWeb] Error:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch highlights'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchHighlights();
    }, [domain]);

    return { highlights, isLoading, error };
}
