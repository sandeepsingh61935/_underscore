import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  clearDashboardDataSessionMemory,
  useDashboardData,
  type DashboardData,
} from '@/features/collections/hooks/useDashboardData';

const fetchAction = vi.fn();

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: () => fetchAction,
}));

vi.mock('@/features/collections/hooks/use-library-data-changed', () => ({
  useLibraryDataChanged: () => undefined,
}));

function sample(n: number): DashboardData {
  return {
    totalHighlights: n,
    totalDomains: 1,
    thisWeekCount: 0,
    todayCount: 0,
    withNotesCount: 0,
    withTagsCount: 0,
    recentHighlights: [],
  };
}

describe('useDashboardData session memory', () => {
  beforeEach(() => {
    clearDashboardDataSessionMemory();
    fetchAction.mockReset();
    fetchAction.mockResolvedValue({ success: true, data: sample(5) });
  });

  it('second mount paints warm data without loading flash', async () => {
    const first = renderHook(() => useDashboardData('pro', true));
    await waitFor(() => {
      expect(first.result.current.data?.totalHighlights).toBe(5);
      expect(first.result.current.isLoading).toBe(false);
    });
    expect(fetchAction).toHaveBeenCalledTimes(1);
    first.unmount();

    fetchAction.mockClear();
    fetchAction.mockResolvedValue({ success: true, data: sample(5) });

    const second = renderHook(() => useDashboardData('pro', true));
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.data?.totalHighlights).toBe(5);

    await waitFor(() => {
      expect(fetchAction).toHaveBeenCalled();
    });
    // Silent revalidate — never flipped back to loading over warm data
    expect(second.result.current.isLoading).toBe(false);
  });

  it('mode change does not paint foreign mode snapshot', async () => {
    const pro = renderHook(() => useDashboardData('pro', true));
    await waitFor(() => {
      expect(pro.result.current.data?.totalHighlights).toBe(5);
    });
    pro.unmount();

    fetchAction.mockResolvedValue({ success: true, data: sample(9) });
    const basic = renderHook(() => useDashboardData('basic', true));
    // Different key — cold until fetch (or empty), not pro's 5
    expect(basic.result.current.data?.totalHighlights).not.toBe(5);

    await waitFor(() => {
      expect(basic.result.current.data?.totalHighlights).toBe(9);
    });
  });

  it('logout clears auth snapshot so remount does not flash prior user totals', async () => {
    const authed = renderHook(
      ({ auth }) => useDashboardData('pro', auth),
      { initialProps: { auth: true } },
    );
    await waitFor(() => {
      expect(authed.result.current.data?.totalHighlights).toBe(5);
    });

    fetchAction.mockResolvedValue({ success: true, data: sample(0) });
    await act(async () => {
      authed.rerender({ auth: false });
    });
    await waitFor(() => {
      expect(authed.result.current.data?.totalHighlights).toBe(0);
    });
    authed.unmount();

    fetchAction.mockResolvedValue({ success: true, data: sample(0) });
    const guest = renderHook(() => useDashboardData('pro', false));
    expect(guest.result.current.data?.totalHighlights).not.toBe(5);
  });
});
