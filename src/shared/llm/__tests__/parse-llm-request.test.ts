import { describe, expect, it } from 'vitest';

import { parseLlmRequest } from '@/shared/llm/runtime/parse-llm-request';

describe('parseLlmRequest', () => {
  it('accepts a valid request', () => {
    const req = parseLlmRequest({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 32,
      temperature: 0.2,
    });
    expect(req).toEqual({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 32,
      temperature: 0.2,
    });
  });

  it('rejects empty messages and bad roles', () => {
    expect(
      parseLlmRequest({
        systemPrompt: 's',
        messages: [],
        maxTokens: 1,
      }),
    ).toBeNull();
    expect(
      parseLlmRequest({
        systemPrompt: 's',
        messages: [{ role: 'system', content: 'x' }],
        maxTokens: 1,
      }),
    ).toBeNull();
  });
});
