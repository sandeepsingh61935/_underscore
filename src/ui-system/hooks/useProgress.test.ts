import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProgress } from './useProgress';

describe('useProgress', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('starts at 0 on mount', () => {
    const { result } = renderHook(() => useProgress(1000));
    expect(result.current).toBe(0);
  });

  it('monotonically increases from 0 toward 1 as time passes', () => {
    const { result } = renderHook(() => useProgress(1000));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    const quarter = result.current;
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(1);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    const half = result.current;
    expect(half).toBeGreaterThan(quarter);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(1);
  });

  it('snaps to 1 immediately when prefers-reduced-motion is set', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useProgress(1000));
    expect(result.current).toBe(1);
  });
});
