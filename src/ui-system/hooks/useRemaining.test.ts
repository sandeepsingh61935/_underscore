import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemaining } from './useRemaining';

describe('useRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns positive ms remaining while before the deadline', () => {
    const now = Date.now();
    const deadline = now + 60_000;
    const { result } = renderHook(() => useRemaining(deadline, vi.fn()));

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(60_000);
  });

  it('returns 0 once the deadline has passed', () => {
    const deadline = Date.now() - 1000;
    const { result } = renderHook(() => useRemaining(deadline, vi.fn()));

    expect(result.current).toBe(0);
  });

  it('fires onExpire exactly once when the deadline passes', () => {
    const onExpire = vi.fn();
    const deadline = Date.now() + 500;
    const { result } = renderHook(() => useRemaining(deadline, onExpire));

    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
