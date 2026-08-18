import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import {
  clearHighlightsByDomainSessionMemory,
  useHighlightsByDomain,
} from '@/features/collections/hooks/useHighlightsByDomainFactory';

const getHighlightsAction = vi.fn();

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: () => getHighlightsAction,
}));

vi.mock('@/features/collections/hooks/use-library-data-changed', () => ({
  useLibraryDataChanged: () => undefined,
}));

function ipcHighlights(ids: string[]) {
  return {
    success: true as const,
    data: {
      highlights: ids.map((id) => ({
        id,
        url: `https://example.com/${id}`,
        text: `t-${id}`,
        path: `/${id}`,
        createdAt: new Date().toISOString(),
      })),
    },
  };
}

describe('useHighlightsByDomain session memory', () => {
  beforeEach(() => {
    clearHighlightsByDomainSessionMemory();
    getHighlightsAction.mockReset();
    // Extension path when chrome.runtime.id is set — factory checks chrome.runtime.id.
    const g = globalThis as { chrome?: { runtime?: { id?: string } } };
    if (!g.chrome?.runtime?.id) {
      g.chrome = { runtime: { id: 'test-ext' } };
    }
    getHighlightsAction.mockResolvedValue(ipcHighlights(['h1']));
  });

  it('second mount for same domain paints warm without loading flash', async () => {
    const first = renderHook(() => useHighlightsByDomain('example.com', true));
    await waitFor(() => {
      expect(first.result.current.highlights).toHaveLength(1);
      expect(first.result.current.isLoading).toBe(false);
    });
    first.unmount();

    getHighlightsAction.mockClear();
    getHighlightsAction.mockResolvedValue(ipcHighlights(['h1', 'h2']));

    const second = renderHook(() => useHighlightsByDomain('example.com', true));
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.highlights.map((h) => h.id)).toEqual(['h1']);

    await waitFor(() => {
      expect(second.result.current.highlights).toHaveLength(2);
    });
    expect(second.result.current.isLoading).toBe(false);
  });

  it('different domain does not reuse prior domain rows', async () => {
    const a = renderHook(() => useHighlightsByDomain('a.com', true));
    await waitFor(() => {
      expect(a.result.current.highlights).toHaveLength(1);
    });
    a.unmount();

    getHighlightsAction.mockResolvedValue(ipcHighlights(['other']));
    const b = renderHook(() => useHighlightsByDomain('b.com', true));
    expect(b.result.current.highlights.find((h) => h.id === 'h1')).toBeUndefined();

    await waitFor(() => {
      expect(b.result.current.highlights.map((h) => h.id)).toEqual(['other']);
    });
  });
});
