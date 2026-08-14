import { describe, expect, it, vi } from 'vitest';

import { noopPageContextFetch } from '../noop-page-context-fetch';
import { prepareHighlightExcerpts } from '../prepare-highlight-excerpts';

const highlights = [
  {
    id: 'h1',
    text: 'quoted mark',
    url: 'https://example.com/a',
    title: 'example.com',
  },
];

describe('prepareHighlightExcerpts', () => {
  it('uses page excerpts when fetch succeeds with content', async () => {
    const rich = [
      {
        id: 'h1',
        url: 'https://example.com/a',
        highlightText: 'quoted mark',
        pageTitle: 'A',
        excerpt: '…surrounding quoted mark text…',
      },
    ];
    const fetch = vi.fn().mockResolvedValue({
      success: true,
      data: { highlightExcerpts: rich, cacheMissUrls: [] },
    });

    const result = await prepareHighlightExcerpts(highlights, fetch);
    expect(result.excerpts).toEqual(rich);
    expect(result.errorNote).toBeNull();
    expect(result.cacheNote).toBeNull();
  });

  it('falls back to quote excerpts when page context is empty (web noop)', async () => {
    const result = await prepareHighlightExcerpts(highlights, noopPageContextFetch);
    expect(result.excerpts.length).toBeGreaterThan(0);
    expect(result.excerpts[0]?.highlightText).toContain('quoted mark');
    expect(result.errorNote).toBeNull();
  });

  it('falls back with errorNote when fetch fails', async () => {
    const fetch = vi.fn().mockResolvedValue({
      success: false,
      error: 'IPC failed',
    });
    const result = await prepareHighlightExcerpts(highlights, fetch);
    expect(result.excerpts.length).toBeGreaterThan(0);
    expect(result.errorNote).toBe('IPC failed');
  });
});
