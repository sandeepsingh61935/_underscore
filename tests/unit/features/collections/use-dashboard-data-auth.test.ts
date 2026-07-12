import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useDashboardData } from '@/features/collections/hooks/useDashboardData';

const fetchAction = vi.fn();

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: () => fetchAction,
}));

vi.mock('@/features/collections/hooks/use-library-data-changed', () => ({
  useLibraryDataChanged: () => undefined,
}));

describe('useDashboardData auth clearing', () => {
  beforeEach(() => {
    fetchAction.mockReset();
    fetchAction.mockResolvedValue({
      success: true,
      data: {
        totalHighlights: 5,
        totalDomains: 2,
        thisWeekCount: 1,
        recentHighlights: [],
      },
    });
  });

  it('clears stale data synchronously when auth becomes false', async () => {
    const { result, rerender } = renderHook(
      ({ isAuthenticated }) => useDashboardData('pro', isAuthenticated),
      { initialProps: { isAuthenticated: true } },
    );

    await waitFor(() => {
      expect(result.current.data?.totalHighlights).toBe(5);
    });

    fetchAction.mockResolvedValue({
      success: true,
      data: {
        totalHighlights: 2,
        totalDomains: 1,
        thisWeekCount: 0,
        recentHighlights: [],
      },
    });

    rerender({ isAuthenticated: false });

    await waitFor(() => {
      expect(result.current.data?.totalHighlights).toBe(2);
    });
  });
});
