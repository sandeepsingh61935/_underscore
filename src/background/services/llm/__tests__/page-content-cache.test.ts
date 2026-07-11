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
    const got = cache.getByTabId(1);
    expect(got?.text).toBe('hello');
  });

  it('stores and retrieves content by URL', () => {
    cache.set(1, { url: 'https://example.com/a#hash', title: 'A', text: 'body', truncated: false, originalLength: 4, pushedAt: Date.now() });
    const got = cache.getByUrl('https://example.com/a');
    expect(got?.text).toBe('body');
  });

  it('returns null after TTL elapses', () => {
    cache.set(1, { url: 'https://x', title: 'X', text: 'hello', truncated: false, originalLength: 5, pushedAt: Date.now() });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(cache.getByTabId(1)).toBeNull();
    expect(cache.getByUrl('https://x')).toBeNull();
  });

  it('keeps URL cache after tab is deleted', () => {
    cache.set(1, { url: 'https://x', title: 'X', text: 'hello', truncated: false, originalLength: 5, pushedAt: Date.now() });
    cache.deleteTab(1);
    expect(cache.getByTabId(1)).toBeNull();
    expect(cache.getByUrl('https://x')?.text).toBe('hello');
  });
});
