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
        // TODO: Replace with real DI injection of SupabaseCollectionRepository via MessageBus
        const fetchCollections = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
                setCollections([
                    { id: '1', domain: 'wikipedia.org', highlightCount: 12, lastActive: new Date() },
                    { id: '2', domain: 'medium.com', highlightCount: 5, lastActive: new Date(Date.now() - 86400000) },
                    { id: '3', domain: 'stackoverflow.com', highlightCount: 8, lastActive: new Date(Date.now() - 172800000) },
                ]);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch collections'));
                setIsLoading(false);
            }
        };

        fetchCollections();
    }, []);

    return { collections, isLoading, error };
}
