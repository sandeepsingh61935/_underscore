import { useState, useEffect } from 'react';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { DomainCollection } from '@/shared/types/domain-collection';

interface CollectionsResult {
  collections: DomainCollection[];
  isLoading: boolean;
  error: Error | null;
}

export function useCollections(currentMode: ModeType): CollectionsResult {
  const { dataProvider } = useApp();
  const [result, setResult] = useState<CollectionsResult>({
    collections: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchCollections = async () => {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const collections = await dataProvider.getCollections(currentMode);
        
        if (!cancelled) {
          setResult({
            collections,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            collections: [],
            isLoading: false,
            error: err instanceof Error ? err : new Error('Failed to fetch collections'),
          });
        }
      }
    };

    fetchCollections();

    return () => {
      cancelled = true;
    };
  }, [currentMode, dataProvider]);

  return result;
}
