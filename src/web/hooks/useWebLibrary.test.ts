import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import {
  clearWebLibrarySessionMemory,
  mergeLibraryRowsWithLocal,
  useWebLibrary,
  type WebHighlight,
} from './useWebLibrary';

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
    clearWebLibrarySessionMemory();
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
    expect(typeof result.current.patchHighlight).toBe('function');
  });

  it('signed-in: patchHighlight updates note and tags in local aggregate', async () => {
    const now = Date.now();
    const fetchHighlights = vi.fn().mockResolvedValue([
      hl({ id: '1', domain: 'a.com', path: '/', savedAt: now, note: '', tags: [] }),
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

    act(() => {
      result.current.patchHighlight('1', { note: 'hello note', tags: ['x'] });
    });

    expect(result.current.highlights[0]?.note).toBe('hello note');
    expect(result.current.highlights[0]?.tags).toEqual(['x']);
    expect(result.current.recent[0]?.note).toBe('hello note');
  });

  it('signed-in: removeHighlights drops rows and re-aggregates', async () => {
    const now = Date.now();
    const fetchHighlights = vi.fn().mockResolvedValue([
      hl({ id: '1', domain: 'a.com', path: '/docs', savedAt: now }),
      hl({ id: '2', domain: 'a.com', path: '/docs', savedAt: now - 1 }),
      hl({ id: '3', domain: 'b.com', path: '/', savedAt: now - 2 }),
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
      expect(result.current.highlights).toHaveLength(3);
    });

    act(() => {
      result.current.removeHighlights(['1', '3']);
    });

    expect(result.current.highlights.map((h) => h.id)).toEqual(['2']);
    expect(result.current.domains).toHaveLength(1);
    expect(result.current.domains[0]?.domain).toBe('a.com');
    expect(result.current.stats.highlightCount).toBe(1);
  });

  it('mergeLibraryRowsWithLocal keeps fresher local tags over stale server row', () => {
    const server = [hl({ id: '1', domain: 'a.com', path: '/', savedAt: 100, tags: [] })];
    const local = [
      hl({ id: '1', domain: 'a.com', path: '/', savedAt: 200, tags: ['kept'], note: 'n' }),
    ];
    const merged = mergeLibraryRowsWithLocal(server, local);
    expect(merged[0]?.tags).toEqual(['kept']);
    expect(merged[0]?.note).toBe('n');
    expect(merged[0]?.savedAt).toBe(200);
  });

  it('signed-in: delayed network refresh does not wipe a fresher tag patch', async () => {
    const now = Date.now();
    let release!: (rows: WebHighlight[]) => void;
    const gate = new Promise<WebHighlight[]>((resolve) => {
      release = resolve;
    });
    const fetchHighlights = vi.fn().mockReturnValue(gate);

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights,
      }),
    );

    // Warm session first so subsequent force refresh merges.
    await act(async () => {
      release([hl({ id: '1', domain: 'a.com', path: '/', savedAt: now, tags: [] })]);
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.patchHighlight('1', { tags: ['saved-tag'] });
    });
    expect(result.current.highlights[0]?.tags).toEqual(['saved-tag']);

    // Stale list response (older savedAt, empty tags) must not clobber the patch.
    const staleGate = new Promise<WebHighlight[]>((resolve) => {
      release = resolve;
    });
    fetchHighlights.mockReturnValue(staleGate);
    const refreshPromise = result.current.refresh();
    await act(async () => {
      release([hl({ id: '1', domain: 'a.com', path: '/', savedAt: now, tags: [] })]);
      await refreshPromise;
    });

    expect(result.current.highlights[0]?.tags).toEqual(['saved-tag']);
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

  it('logout while fetch in-flight: stale success does not populate guest', async () => {
    let resolveFetch!: (rows: WebHighlight[]) => void;
    const fetchHighlights = vi.fn(
      () =>
        new Promise<WebHighlight[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ isAuthenticated, planLabel }: { isAuthenticated: boolean; planLabel: string }) =>
        useWebLibrary({ isAuthenticated, planLabel, fetchHighlights }),
      { initialProps: { isAuthenticated: true, planLabel: 'Free' } },
    );

    expect(result.current.status).toBe('loading');
    expect(fetchHighlights).toHaveBeenCalledTimes(1);

    rerender({ isAuthenticated: false, planLabel: 'Guest' });

    await waitFor(() => {
      expect(result.current.isGuest).toBe(true);
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.highlights).toEqual([]);

    await act(async () => {
      resolveFetch([hl({ id: 'stale', domain: 'leak.com', path: '/', savedAt: Date.now() })]);
      // Allow microtasks from the stale promise to run
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isGuest).toBe(true);
    expect(result.current.highlights).toEqual([]);
    expect(result.current.domains).toEqual([]);
    expect(result.current.currentPage).toBeNull();
    expect(result.current.stats.highlightCount).toBe(0);
  });

  it('second mount: paints session memory immediately without waiting on fetch', async () => {
    const rows = [hl({ id: '1', domain: 'a.com', path: '/', savedAt: 1 })];
    const fetchHighlights = vi.fn().mockResolvedValue(rows);

    const first = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(first.result.current.status).toBe('ready');
    });
    expect(fetchHighlights).toHaveBeenCalledTimes(1);
    first.unmount();

    const fetch2 = vi.fn().mockResolvedValue(rows);
    const second = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights: fetch2,
      }),
    );

    // Session memory: ready with data on first paint (no loading flash).
    expect(second.result.current.status).toBe('ready');
    expect(second.result.current.highlights).toHaveLength(1);
    // Fresh memory (< 60s) skips network until refresh or stale.
    expect(fetch2).not.toHaveBeenCalled();

    await act(async () => {
      await second.result.current.refresh();
    });
    expect(fetch2).toHaveBeenCalledTimes(1);
  });

  it('sequential refresh: only latest response wins', async () => {
    const resolvers: Array<(rows: WebHighlight[]) => void> = [];
    const fetchHighlights = vi.fn(
      () =>
        new Promise<WebHighlight[]>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() =>
      useWebLibrary({
        isAuthenticated: true,
        planLabel: 'Free',
        fetchHighlights,
      }),
    );

    await waitFor(() => {
      expect(fetchHighlights).toHaveBeenCalledTimes(1);
    });

    // Start second load while first is still pending
    let refreshDone: Promise<void> | undefined;
    await act(async () => {
      refreshDone = result.current.refresh();
    });

    await waitFor(() => {
      expect(fetchHighlights).toHaveBeenCalledTimes(2);
    });
    expect(resolvers).toHaveLength(2);

    const first = resolvers[0]!;
    const second = resolvers[1]!;

    // Older fetch resolves first with "stale" data
    await act(async () => {
      first([hl({ id: 'old', domain: 'old.com', path: '/', savedAt: 1 })]);
      await Promise.resolve();
    });

    // Still loading for latest gen; must not apply old rows
    expect(result.current.highlights.find((h) => h.id === 'old')).toBeUndefined();

    await act(async () => {
      second([
        hl({ id: 'new-a', domain: 'new.com', path: '/', savedAt: 2 }),
        hl({ id: 'new-b', domain: 'new.com', path: '/x', savedAt: 3 }),
      ]);
      await refreshDone;
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.highlights.map((h) => h.id)).toEqual(['new-a', 'new-b']);
    expect(result.current.stats.highlightCount).toBe(2);
    expect(result.current.domains.map((d) => d.domain)).toEqual(['new.com']);
  });
});
