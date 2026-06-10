import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './prefersReducedMotion';

describe('prefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when matchMedia reports reduce', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia reports no preference', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads the live value on each call, not a cached one', () => {
    let reduce = false;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: reduce,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(false);
    reduce = true;
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false on SSR (no window) without throwing', () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });
});
