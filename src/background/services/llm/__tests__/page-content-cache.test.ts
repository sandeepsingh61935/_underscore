import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BackgroundPageContentCache } from '../page-content-cache';

describe('BackgroundPageContentCache', () => {
  let cache: BackgroundPageContentCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new BackgroundPageContentCache({ ttlMs: 30 * 60 * 1000 });
  });

  it('stores and retrieves content by tabId', () => {
    cache.set(1, { url: 'https://x', title: 'X', text: 'hello', truncated: false, originalLength: 5, pushedAt: Date.now() });
    const got = cache.get(1);
    expect(got?.text).toBe('hello');
  });

  it('returns null after TTL elapses', () => {
    cache.set(1, { url: 'https://x', title: 'X', text: 'hello', truncated: false, originalLength: 5, pushedAt: Date.now() });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(cache.get(1)).toBeNull();
  });

  it('evicts entries on delete', () => {
    cache.set(1, { url: 'x', title: 'X', text: 't', truncated: false, originalLength: 1, pushedAt: Date.now() });
    cache.delete(1);
    expect(cache.get(1)).toBeNull();
  });
});