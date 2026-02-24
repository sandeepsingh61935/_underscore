import { useState, useEffect } from 'react';

// Mock type matching the repository
export interface DomainCollection {
    id: string;
    domain: string;
    highlightCount: number;
    lastActive: Date;
}

export function useCollections() {
    const [collections, setCollections] = useState<DomainCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                if (!chrome?.runtime) {
                    throw new Error('Chrome runtime unavailable');
                }

                console.log('[useCollections] Requesting GET_COLLECTIONS from background');
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_COLLECTIONS',
                    timestamp: Date.now()
                });

                if (!response || !response.success) {
                    throw new Error(response?.error || 'Failed to fetch collections: no response');
                }

                // Map stringified dates back to Date objects
                const parsedCollections = (response.data.collections || []).map((col: any) => ({
                    ...col,
                    lastActive: new Date(col.lastActive)
                }));

                setCollections(parsedCollections);
            } catch (err) {
                console.error('[useCollections] Error:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch collections'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollections();
    }, []);

    return { collections, isLoading, error };
}
