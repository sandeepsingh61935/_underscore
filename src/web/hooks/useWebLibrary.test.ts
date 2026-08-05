import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useWebLibrary, type WebHighlight } from './useWebLibrary';

function hl(
  partial: Partial<WebHighlight> & Pick<WebHighlight, 'id' | 'domain' | 'path' | 'savedAt'>,
): WebHighlight {
  return {
    quote: partial.quote ?? `quote-${partial.id}`,
    note: partial.note ?? '',
    tags: partial.tags ?? [],
    ...partial,
  };
}

describe('useWebLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guest: ready empty state and never calls fetchHighlights', async () => {
    const fetchHighlights = vi.fn().mockResolvedValue([
      hl({ id: 'seed', domain: 'evil.com', path: '/', savedAt: Date.now() }),
    ]);

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: false,
        planLabel: 'Guest',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(fetchHighlights).not.toHaveBeenCalled();
    expect(result.current.isGuest).toBe(true);
    expect(result.current.highlights).toEqual([]);
    expect(result.current.domains).toEqual([]);
    expect(result.current.recent).toEqual([]);
    expect(result.current.currentPage).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.stats).toEqual({
      highlightCount: 0,
      pageCount: 0,
      thisWeekCount: 0,
      planLabel: 'Guest',
    });
  });

  it('signed-in: loads via fetchHighlights and aggregates', async () => {
    const now = Date.now();
    const rows = [
      hl({ id: '1', domain: 'a.com', path: '/docs', savedAt: now, quote: 'hello' }),
      hl({ id: '2', domain: 'a.com', path: '/docs', savedAt: now - 1000 }),
      hl({ id: '3', domain: 'b.com', path: '/', savedAt: now - 2000 }),
    ];
    const fetchHighlights = vi.fn().mockResolvedValue(rows);

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights,
      }),
    );

    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(fetchHighlights).toHaveBeenCalledTimes(1);
    expect(result.current.isGuest).toBe(false);
    expect(result.current.highlights).toHaveLength(3);
    expect(result.current.stats.highlightCount).toBe(3);
    expect(result.current.stats.pageCount).toBe(2);
    expect(result.current.stats.planLabel).toBe('Free');
    expect(result.current.domains.map((d) => d.domain)).toEqual(['a.com', 'b.com']);
    expect(result.current.currentPage).toMatchObject({
      domain: 'a.com',
      path: '/docs',
      highlightCount: 2,
    });
    expect(result.current.recent[0]?.id).toBe('1');
    expect(result.current.error).toBeNull();
  });

  it('signed-in: surfaces error from fetch', async () => {
    const fetchHighlights = vi.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Paid',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe('network down');
    expect(result.current.highlights).toEqual([]);
  });

  it('refresh re-fetches and updates state', async () => {
    const fetchHighlights = vi
      .fn()
      .mockResolvedValueOnce([hl({ id: '1', domain: 'a.com', path: '/', savedAt: 1 })])
      .mockResolvedValueOnce([
        hl({ id: '1', domain: 'a.com', path: '/', savedAt: 1 }),
        hl({ id: '2', domain: 'b.com', path: '/', savedAt: 2 }),
      ]);

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.stats.highlightCount).toBe(1);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.stats.highlightCount).toBe(2);
    });
    expect(fetchHighlights).toHaveBeenCalledTimes(2);
  });

  it('guest refresh still does not call fetch', async () => {
    const fetchHighlights = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: false,
        planLabel: 'Guest',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchHighlights).not.toHaveBeenCalled();
    expect(result.current.highlights).toEqual([]);
  });
});
