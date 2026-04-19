/**
 * Context-aware highlights by domain hook
 * Uses dynamic import to load the appropriate hook based on runtime context
 * Always calls useState/useEffect in the same order
 */

import { useState, useEffect } from 'react';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
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

/**
 * Unified hook for highlights by domain that works in both extension and web contexts.
 * Uses chrome.runtime for extension, Supabase directly for web.
 */
export function useHighlightsByDomain(domain: string | undefined): HighlightsResult {
    const [result, setResult] = useState<HighlightsResult>({
        highlights: [],
        isLoading: true,
        error: null,
    });

    const context = isExtensionContext() ? 'extension' : 'web';

    useEffect(() => {
        if (!domain) {
            setResult({ highlights: [], isLoading: false, error: null });
            return;
        }

        let cancelled = false;

        const fetchHighlights = async () => {
            try {
                if (context === 'extension') {
                    // Extension context - use chrome.runtime
                    const response = await chrome.runtime.sendMessage({
                        type: 'GET_HIGHLIGHTS_BY_DOMAIN',
                        payload: { domain },
                        timestamp: Date.now(),
                    });

                    if (cancelled) return;

                    if (!response || !response.success) {
                        throw new Error(response?.error || 'Failed to fetch highlights');
                    }

                    const highlights: Highlight[] = (response.data.highlights || []).map((hl: any) => ({
                        id: hl.id,
                        url: hl.url,
                        text: hl.text,
                        path: hl.path || new URL(hl.url).pathname,
                        createdAt: new Date(hl.createdAt),
                    }));

                    setResult({ highlights, isLoading: false, error: null });
                } else {
                    // Web context - use Supabase directly
                    const { createClient } = await import('@supabase/supabase-js');

                    const url = import.meta.env.VITE_SUPABASE_URL;
                    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                    if (!url || !anonKey) {
                        setResult({ highlights: [], isLoading: false, error: null });
                        return;
                    }

                    const supabase = createClient(url, anonKey);
                    const { data: { session } } = await supabase.auth.getSession();

                    if (cancelled) return;

                    if (!session?.user) {
                        setResult({ highlights: [], isLoading: false, error: null });
                        return;
                    }

                    const { data, error: queryError } = await supabase
                        .from('highlights')
                        .select('id, url, text, created_at, updated_at')
                        .eq('user_id', session.user.id)
                        .is('deleted_at', null)
                        .ilike('url', `%${domain}%`);

                    if (cancelled) return;

                    if (queryError) throw queryError;

                    const highlights: Highlight[] = (data || []).map((hl) => {
                        const url = new URL(hl.url);
                        return {
                            id: hl.id,
                            url: hl.url,
                            text: hl.text,
                            path: url.pathname,
                            createdAt: new Date(hl.created_at),
                        };
                    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                    setResult({ highlights, isLoading: false, error: null });
                }
            } catch (err) {
                if (cancelled) return;
                setResult({
                    highlights: [],
                    isLoading: false,
                    error: err instanceof Error ? err : new Error('Failed to fetch highlights'),
                });
            }
        };

        fetchHighlights();

        return () => {
            cancelled = true;
        };
    }, [domain, context]);

    return result;
}
