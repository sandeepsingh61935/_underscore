import { describe, it, expect } from 'vitest';

import { buildHighlightExcerpts, extractExcerptWindow } from '../highlight-excerpts';

describe('extractExcerptWindow', () => {
  it('wraps highlight in mark tags with surrounding context', () => {
    const page = 'prefix ' + 'A'.repeat(200) + 'TARGET' + 'B'.repeat(200) + ' suffix';
    const window = extractExcerptWindow(page, 'TARGET', 50);
    expect(window).toContain('<mark>TARGET</mark>');
    expect(window).toContain('A');
    expect(window).toContain('B');
  });

  it('returns marked highlight when span not found in page', () => {
    expect(extractExcerptWindow('no match here', 'missing')).toBe('<mark>missing</mark>');
  });
});

describe('buildHighlightExcerpts', () => {
  it('builds excerpt windows from cached page text', () => {
    const { excerpts, cacheMissUrls } = buildHighlightExcerpts(
      [{ id: 'h1', url: 'https://example.com', text: 'hello' }],
      () => ({
        url: 'https://example.com',
        title: 'Example',
        text: 'Say hello world today.',
        truncated: false,
      })
    );

    expect(cacheMissUrls).toEqual([]);
    expect(excerpts).toHaveLength(1);
    expect(excerpts[0]?.excerpt).toContain('<mark>hello</mark>');
    expect(excerpts[0]?.pageTitle).toBe('Example');
  });

  it('falls back to highlight-only excerpt on cache miss', () => {
    const { excerpts, cacheMissUrls } = buildHighlightExcerpts(
      [{ url: 'https://example.com', text: 'quote' }],
      () => null
    );

    expect(cacheMissUrls).toEqual(['https://example.com']);
    expect(excerpts[0]?.excerpt).toBe('<mark>quote</mark>');
    expect(excerpts[0]?.id).toBe('hl-0');
  });
});
