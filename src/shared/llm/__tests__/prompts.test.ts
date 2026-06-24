import { describe, it, expect } from 'vitest';

import { PROMPT_TEMPLATES } from '../prompts';
import type { PromptContext } from '../prompts';

const baseCtx: PromptContext = {
  pageTitle: 'How attention works',
  pageUrl: 'https://example.com/attention',
  pageContextWithMarks: '<p>Attention is <mark>the allocation of limited cognitive resources</mark>.</p>',
  pageContext: 'Attention is the allocation of limited cognitive resources.',
  highlights: [
    { id: 'h1', text: 'the allocation of limited cognitive resources', url: 'https://example.com/attention', title: 'How attention works' },
  ],
  domain: 'example.com',
  uniqueUrls: 1,
  length: 'medium',
};

describe('PROMPT_TEMPLATES', () => {
  it('explain renders single-highlight context', () => {
    const out = PROMPT_TEMPLATES.explain(baseCtx);
    expect(out).toContain('How attention works');
    expect(out).toContain('the allocation of limited cognitive resources');
  });

  it('summarizePage renders page context with marks', () => {
    const out = PROMPT_TEMPLATES.summarizePage(baseCtx);
    expect(out).toContain('<mark>');
    expect(out).toContain('medium');
    expect(out).toContain('1 span');
  });

  it('synthesizeDomain aggregates across URLs', () => {
    const ctx: PromptContext = { ...baseCtx, highlights: [
      ...baseCtx.highlights,
      { id: 'h2', text: 'attention is selective', url: 'https://other.com/x', title: 'Selective attention' },
    ]};
    const out = PROMPT_TEMPLATES.synthesizeDomain(ctx);
    expect(out).toContain('example.com');
    expect(out).toContain('https://other.com/x');
  });
});