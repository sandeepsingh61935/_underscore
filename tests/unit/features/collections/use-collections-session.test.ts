import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import {
  clearCollectionsSessionMemory,
  useCollections,
} from '@/features/collections/hooks/useCollections';
import type { DomainCollection } from '@/shared/types/domain-collection';

const getCollections = vi.fn();

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({
    dataProvider: { getCollections },
    isAuthenticated: mockAuth.isAuthenticated,
  }),
}));

vi.mock('@/features/collections/hooks/use-library-data-changed', () => ({
  useLibraryDataChanged: () => undefined,
}));

const mockAuth = { isAuthenticated: true };

function cols(domains: string[]): DomainCollection[] {
  return domains.map((domain) => ({
    id: domain,
    domain,
    highlightCount: 1,
  }));
}

describe('useCollections session memory', () => {
  beforeEach(() => {
    clearCollectionsSessionMemory();
    mockAuth.isAuthenticated = true;
    getCollections.mockReset();
    getCollections.mockResolvedValue(cols(['a.com']));
  });

  it('second mount paints warm collections without loading flash', async () => {
    const first = renderHook(() => useCollections('pro'));
    await waitFor(() => {
      expect(first.result.current.collections).toHaveLength(1);
      expect(first.result.current.isLoading).toBe(false);
    });
    first.unmount();

    getCollections.mockClear();
    getCollections.mockResolvedValue(cols(['a.com', 'b.com']));

    const second = renderHook(() => useCollections('pro'));
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.collections.map((c) => c.domain)).toEqual(['a.com']);

    await waitFor(() => {
      expect(second.result.current.collections).toHaveLength(2);
    });
    expect(second.result.current.isLoading).toBe(false);
  });
});
