import { describe, it, expect } from 'vitest';

import type { HighlightExcerpt } from '../highlight-excerpts';
import { PROMPT_TEMPLATES } from '../prompts';
import {
  buildScopeQueryRequest,
  formatScopeQueryUserContent,
} from '../scope-query-request';

const excerpts: HighlightExcerpt[] = [
  {
    id: 'h1',
    url: 'https://example.com',
    highlightText: 'key idea',
    pageTitle: 'Example',
    excerpt: 'Body with <mark>key idea</mark>.',
  },
];

describe('scope query', () => {
  it('askScope restricts answers to highlight excerpts', () => {
    const out = PROMPT_TEMPLATES.askScope({
      scopeLabel: '/learn/foo',
      scopeKind: 'section',
      highlightCount: 3,
    });
    expect(out).toContain('ONLY');
    expect(out).toContain('/learn/foo');
    expect(out).toContain("That isn't covered in your highlights");
  });

  it('formats question after excerpts', () => {
    const user = formatScopeQueryUserContent(excerpts, 'What is the main theme?');
    expect(user.indexOf('key idea')).toBeLessThan(
      user.indexOf('What is the main theme?')
    );
    expect(user).toContain('## Question');
  });

  it('builds scoped query request with scaled output tokens', () => {
    const request = buildScopeQueryRequest({
      scope: { scopeLabel: 'example.com', scopeKind: 'domain', highlightCount: 10 },
      excerpts,
      question: 'How do the ideas connect?',
    });
    expect(request.systemPrompt).toContain('example.com');
    expect(request.messages[0]?.content).toContain('How do the ideas connect?');
    expect(request.maxTokens).toBeGreaterThanOrEqual(512);
    expect(request.temperature).toBe(0.35);
  });
});
