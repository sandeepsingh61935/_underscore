import { useState, useEffect } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { compareByHighlightActivityDesc } from '@/shared/utils/highlight-activity';
import { getSectionPath } from '@/shared/utils/normalize-page-url';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
    updatedAt?: Date;
}

/** Fetch highlights by domain from Supabase for the web app. */
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
                const supabase = getWebSupabaseClient();

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

                // Map to highlight format; newest update first
                const highlights: Highlight[] = (data || []).map((hl) => {
                    return {
                        id: hl.id,
                        url: hl.url,
                        text: hl.text,
                        path: getSectionPath(hl.url),
                        createdAt: new Date(hl.created_at),
                        updatedAt: hl.updated_at ? new Date(hl.updated_at) : undefined,
                    };
                });

                highlights.sort(compareByHighlightActivityDesc);

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
