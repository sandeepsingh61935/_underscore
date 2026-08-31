import { describe, it, expect } from 'vitest';

import { PROMPT_TEMPLATES } from '../prompts';
import type { PromptContext } from '../prompts';

const baseCtx: PromptContext = {
  pageTitle: 'How attention works',
  pageUrl: 'https://example.com/attention',
  pageContextWithMarks:
    'Attention is <mark>the allocation of limited cognitive resources</mark>.',
  pageContext: 'Attention is the allocation of limited cognitive resources.',
  highlights: [
    {
      id: 'h1',
      text: 'the allocation of limited cognitive resources',
      url: 'https://example.com/attention',
      title: 'How attention works',
    },
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

  it('summarizePage instructs highlight-first faithful summary', () => {
    const out = PROMPT_TEMPLATES.summarizePage(baseCtx);
    expect(out).toContain('How attention works');
    expect(out).toContain('1 passage');
    expect(out).toContain('numbered highlight list');
    expect(out).toContain('120-200 words');
    expect(out).not.toContain('the allocation of limited cognitive resources');
  });

  it('synthesizeDomain aggregates across URLs', () => {
    const ctx: PromptContext = {
      ...baseCtx,
      highlights: [
        ...baseCtx.highlights,
        {
          id: 'h2',
          text: 'attention is selective',
          url: 'https://other.com/x',
          title: 'Selective attention',
        },
      ],
    };
    const out = PROMPT_TEMPLATES.synthesizeDomain(ctx);
    expect(out).toContain('example.com');
    expect(out).toContain('https://other.com/x');
  });

  it('askScope grounds answers to highlight excerpts only', () => {
    const out = PROMPT_TEMPLATES.askScope({
      scopeLabel: 'example.com',
      scopeKind: 'domain',
      highlightCount: 5,
    });
    expect(out).toContain('ONLY');
    expect(out).toContain('example.com');
    expect(out).toContain("That isn't covered in your highlights");
  });
});
