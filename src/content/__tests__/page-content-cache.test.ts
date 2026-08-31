import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PageContentCache } from '../page-content-cache';

const MAX_BYTES = 100 * 1024;

describe('PageContentCache', () => {
  let activeCache: PageContentCache | null = null;

  beforeEach(() => {
    document.body.innerHTML = '<p>initial</p>';
  });

  afterEach(() => {
    // jsdom MutationObservers fire async on teardown — disconnect first.
    activeCache?.stop();
    activeCache = null;
  });

  it('pushes initial content on start', () => {
    const send = vi.fn();
    const cache = new PageContentCache(send, { debounceMs: 0, maxBytes: MAX_BYTES });
    activeCache = cache;
    cache.start();
    expect(send).toHaveBeenCalled();
    const firstCall = send.mock.calls[0];
    const payload = (firstCall?.[0] as { payload: { text: string } }).payload;
    expect(payload.text).toContain('initial');
  });

  it('truncates text beyond maxBytes', () => {
    const longText = 'x'.repeat(MAX_BYTES + 1000);
    document.body.innerHTML = `<p>${longText}</p>`;
    const send = vi.fn();
    const cache = new PageContentCache(send, { debounceMs: 0, maxBytes: MAX_BYTES });
    activeCache = cache;
    cache.start();
    const firstCall = send.mock.calls[0];
    const payload = (
      firstCall?.[0] as {
        payload: { text: string; truncated: boolean; originalLength: number };
      }
    ).payload;
    expect(payload.truncated).toBe(true);
    expect(payload.text.length).toBe(MAX_BYTES);
    expect(payload.originalLength).toBe(longText.length);
  });

  it('includes title and URL in payload', () => {
    const send = vi.fn();
    const cache = new PageContentCache(
      send,
      { debounceMs: 0, maxBytes: MAX_BYTES },
      { title: 'Test Page', url: 'https://example.com/x' }
    );
    activeCache = cache;
    cache.start();
    const firstCall = send.mock.calls[0];
    const payload = (firstCall?.[0] as { payload: { title: string; url: string } })
      .payload;
    expect(payload.title).toBe('Test Page');
    expect(payload.url).toBe('https://example.com/x');
  });
});
