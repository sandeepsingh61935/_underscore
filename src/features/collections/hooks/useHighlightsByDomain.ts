import { useState, useEffect } from 'react';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
}

export function useHighlightsByDomain(domain: string | undefined) {
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
                if (!chrome?.runtime) {
                    throw new Error('Chrome runtime unavailable');
                }

                console.log('[useHighlightsByDomain] Requesting GET_HIGHLIGHTS_BY_DOMAIN', { domain });
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_HIGHLIGHTS_BY_DOMAIN',
                    payload: { domain },
                    timestamp: Date.now()
                });

                if (!response || !response.success) {
                    throw new Error(response?.error || 'Failed to fetch highlights: no response');
                }

                // Map stringified dates back to Date objects
                const parsedHighlights = (response.data.highlights || []).map((hl: any) => ({
                    id: hl.id,
                    url: hl.url,
                    text: hl.text,
                    path: hl.path || new URL(hl.url).pathname,
                    createdAt: new Date(hl.createdAt)
                }));

                setHighlights(parsedHighlights);
            } catch (err) {
                console.error('[useHighlightsByDomain] Error:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch highlights'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchHighlights();
    }, [domain]);

    return { highlights, isLoading, error };
}
