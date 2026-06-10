import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTicker } from './useTicker';

describe('useTicker', () => {
  const originalMatchMedia = window.matchMedia;
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    if (originalHidden) {
      Object.defineProperty(document, 'hidden', originalHidden);
    }
  });

  it('returns a number that advances as time passes', () => {
    const { result } = renderHook(() => useTicker(1000));

    const first = result.current;
    expect(typeof first).toBe('number');

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBeGreaterThan(first);
  });

  it('returns the initial value and does not advance when prefers-reduced-motion is set', () => {
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

    const { result } = renderHook(() => useTicker(1000));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current).toBe(initial);
  });

  it('uses a default interval of 1000ms when no argument is given', () => {
    const { result } = renderHook(() => useTicker());

    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(first);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBeGreaterThan(first);
  });

  it('pauses while the document is hidden, then resumes when visible', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    const { result } = renderHook(() => useTicker(1000));
    const before = result.current;

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(before);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    act(() => {
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBeGreaterThan(before);
  });
});
