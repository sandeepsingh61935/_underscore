import { useState, useEffect, useCallback } from 'react';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';

export interface Highlight {
    id: string;
    url: string;
    text: string;
    path: string;
    createdAt: Date;
}

interface GetHighlightsByDomainResponse {
    highlights: Array<{
        id: string;
        url: string;
        text: string;
        path?: string;
        createdAt: string;
    }>;
}

export function useHighlightsByDomain(domain: string | undefined) {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAction = useIpcAction<{ domain: string }, GetHighlightsByDomainResponse>('GET_HIGHLIGHTS_BY_DOMAIN');

    const fetchHighlights = useCallback(async () => {
        if (!domain) {
            setHighlights([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        const result = await fetchAction({ domain });

        if (!result.success) {
            setError(new Error(result.error || 'Failed to fetch highlights'));
            setIsLoading(false);
            return;
        }

        const parsedHighlights = (result.data.highlights || []).map((hl) => ({
            id: hl.id,
            url: hl.url,
            text: hl.text,
            path: hl.path || new URL(hl.url).pathname,
            createdAt: new Date(hl.createdAt),
        }));

        setHighlights(parsedHighlights);
        setIsLoading(false);
    }, [domain, fetchAction]);

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

    return { highlights, isLoading, error };
}
