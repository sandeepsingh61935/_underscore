import { describe, it, expect } from 'vitest';

import {
  buildMarkedPageContext,
  compressPageText,
  injectMarksIntoPageText,
} from '../build-page-context';
import {
  buildExcerptSummaryRequest,
  buildSummaryRequest,
  formatExcerptUserContent,
} from '../summary-request';
import type { HighlightExcerpt } from '../highlight-excerpts';
import type { PromptContext } from '../prompts';

describe('compressPageText', () => {
  it('collapses excessive blank lines', () => {
    expect(compressPageText('a\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('injectMarksIntoPageText', () => {
  it('wraps every occurrence of each highlight in mark tags', () => {
    const page = 'Alpha beta gamma. beta again.';
    const result = injectMarksIntoPageText(page, ['beta', 'gamma']);
    expect(result).toContain('<mark>beta</mark>');
    expect(result).toContain('<mark>gamma</mark>');
    expect(result.match(/<mark>beta<\/mark>/g)?.length).toBe(2);
  });

  it('matches highlights when whitespace differs slightly', () => {
    const page = 'The quick brown fox';
    const result = injectMarksIntoPageText(page, ['quick  brown']);
    expect(result).toContain('<mark>quick brown</mark>');
  });
});

describe('buildMarkedPageContext', () => {
  it('uses cached page text with marks when available', () => {
    const result = buildMarkedPageContext(
      [{ url: 'https://example.com/a', text: 'important bit' }],
      () => ({
        url: 'https://example.com/a',
        title: 'Example',
        text: 'This is an important bit of text.',
        truncated: false,
      })
    );

    expect(result.pageContextWithMarks).toContain('<mark>important bit</mark>');
    expect(result.cacheMissUrls).toEqual([]);
    expect(result.pageTitle).toBe('Example');
  });

  it('falls back to highlight quotes when page content is missing', () => {
    const result = buildMarkedPageContext(
      [{ url: 'https://example.com/a', text: 'quote only' }],
      () => null
    );

    expect(result.pageContextWithMarks).toContain('[page content not cached');
    expect(result.pageContextWithMarks).toContain('<mark>quote only</mark>');
    expect(result.cacheMissUrls).toEqual(['https://example.com/a']);
  });
});

describe('summary-request', () => {
  const ctx: PromptContext = {
    pageTitle: 'Test',
    pageUrl: 'https://example.com',
    pageContextWithMarks: 'Body with <mark>key idea</mark>.',
    pageContext: 'Body with key idea.',
    highlights: [
      { id: '1', text: 'key idea', url: 'https://example.com', title: 'Test' },
    ],
    length: 'medium',
  };

  const excerpts: HighlightExcerpt[] = [
    {
      id: '1',
      url: 'https://example.com',
      highlightText: 'key idea',
      pageTitle: 'Test',
      excerpt: 'Body with <mark>key idea</mark>.',
    },
  ];

  it('formats excerpt windows for the user message', () => {
    const user = formatExcerptUserContent(excerpts);
    expect(user).toContain('Highlight excerpts');
    expect(user).toContain('key idea');
    expect(user).toContain('<mark>key idea</mark>');
  });

  it('sets temperature and scaled max tokens for excerpt summary', () => {
    const request = buildExcerptSummaryRequest(ctx, excerpts);
    expect(request.temperature).toBe(0.35);
    expect(request.maxTokens).toBeGreaterThanOrEqual(256);
    expect(request.messages[0]?.content).toContain('key idea');
    expect(request.systemPrompt).toContain('excerpt');
  });

  it('buildSummaryRequest delegates to excerpt-based builder', () => {
    const request = buildSummaryRequest({ ...ctx, length: 'short' });
    expect(request.temperature).toBe(0.35);
    expect(request.maxTokens).toBeGreaterThanOrEqual(256);
  });
});
