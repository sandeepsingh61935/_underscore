import { describe, it, expect, vi } from 'vitest';

import type { HighlightExcerpt } from '../highlight-excerpts';
import type { PromptContext } from '../prompts';
import { summarizeSectionText } from '../summarization-pipeline';

const excerpts: HighlightExcerpt[] = Array.from({ length: 11 }, (_, i) => ({
  id: `h${i}`,
  url: 'https://example.com',
  highlightText: `idea ${i}`,
  pageTitle: 'Example',
  excerpt: `<mark>idea ${i}</mark>`,
}));

const ctx: PromptContext = {
  pageTitle: 'Example',
  pageUrl: 'https://example.com',
  pageContextWithMarks: '',
  pageContext: '',
  highlights: excerpts.map((e, i) => ({
    id: e.id,
    text: e.highlightText,
    url: e.url,
    title: `Example ${i}`,
  })),
  length: 'medium',
};

function makeChat(responseText: string) {
  return vi.fn(async () => ({
    success: true as const,
    data: { text: responseText, inputTokens: 1, outputTokens: 1, durationMs: 1 },
  }));
}

describe('summarizeSectionText', () => {
  it('uses one batched chat call for many highlights', async () => {
    const chat = makeChat('section summary');
    const summary = await summarizeSectionText(ctx, excerpts, chat);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(summary).toBe('section summary');
  });
});
