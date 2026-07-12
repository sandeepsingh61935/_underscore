import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { DomainCollection } from '@/shared/types/domain-collection';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';

interface CollectionsResult {
  collections: DomainCollection[];
  isLoading: boolean;
  error: Error | null;
}

export function useCollections(currentMode: ModeType, isAuthenticated: boolean): CollectionsResult {
  const { dataProvider } = useApp();
  const [result, setResult] = useState<CollectionsResult>({
    collections: [],
    isLoading: true,
    error: null,
  });

  const fetchCollections = useCallback(async () => {
    if (!isAuthenticated) {
      setResult({ collections: [], isLoading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const collections = await dataProvider.getCollections(currentMode);
      setResult({
        collections,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setResult({
        collections: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch collections'),
      });
    }
  }, [currentMode, dataProvider, isAuthenticated]);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  useLibraryDataChanged(() => {
    void fetchCollections();
  });

  return result;
}
