import { useState, useEffect, useCallback, useRef } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { useLibraryDataChanged } from '@/features/collections/hooks/use-library-data-changed';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { DomainCollection } from '@/shared/types/domain-collection';

interface CollectionsResult {
  collections: DomainCollection[];
  isLoading: boolean;
  error: Error | null;
}

type SessionKey = string;

const sessionByKey = new Map<SessionKey, DomainCollection[]>();

function sessionKey(mode: ModeType, isAuthenticated: boolean): SessionKey {
  return `${mode}:${isAuthenticated ? 'auth' : 'guest'}`;
}

export function clearCollectionsSessionMemory(): void {
  sessionByKey.clear();
}

/**
 * Domain collections list. Module session memory keeps last list across popup view swaps.
 */
export function useCollections(currentMode: ModeType): CollectionsResult {
  const { dataProvider, isAuthenticated } = useApp();
  const key = sessionKey(currentMode, isAuthenticated);
  const warm = sessionByKey.get(key);

  const [result, setResult] = useState<CollectionsResult>(() => ({
    collections: warm ?? [],
    isLoading: warm === undefined,
    error: null,
  }));

  const modeRef = useRef(currentMode);
  modeRef.current = currentMode;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const dataProviderRef = useRef(dataProvider);
  dataProviderRef.current = dataProvider;
  const genRef = useRef(0);

  const fetchCollections = useCallback(async (opts?: { silent?: boolean }) => {
    const mode = modeRef.current;
    const auth = authRef.current;
    const activeKey = sessionKey(mode, auth);
    const hasWarm = sessionByKey.has(activeKey);
    const silent = opts?.silent === true || hasWarm;

    if (!silent) {
      setResult((prev) => ({ ...prev, isLoading: true, error: null }));
    } else {
      setResult((prev) => ({ ...prev, error: null }));
    }

    const gen = ++genRef.current;

    try {
      const collections = await dataProviderRef.current.getCollections(mode);
      if (gen !== genRef.current) return;
      if (modeRef.current !== mode || authRef.current !== auth) return;

      sessionByKey.set(activeKey, collections);
      setResult({
        collections,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (gen !== genRef.current) return;
      if (modeRef.current !== mode || authRef.current !== auth) return;

      const error = err instanceof Error ? err : new Error('Failed to fetch collections');
      if (hasWarm) {
        setResult((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        return;
      }
      setResult({
        collections: [],
        isLoading: false,
        error,
      });
    }
  }, []);

  useEffect(() => {
    const activeKey = sessionKey(currentMode, isAuthenticated);
    const cached = sessionByKey.get(activeKey);
    if (cached) {
      setResult({ collections: cached, isLoading: false, error: null });
      void fetchCollections({ silent: true });
    } else {
      setResult({ collections: [], isLoading: true, error: null });
      void fetchCollections({ silent: false });
    }
  }, [currentMode, isAuthenticated, fetchCollections]);

  useEffect(() => {
    if (!isAuthenticated) {
      for (const k of [...sessionByKey.keys()]) {
        if (k.endsWith(':auth')) sessionByKey.delete(k);
      }
    }
  }, [isAuthenticated]);

  useLibraryDataChanged(() => {
    void fetchCollections({ silent: true });
  });

  return result;
}
