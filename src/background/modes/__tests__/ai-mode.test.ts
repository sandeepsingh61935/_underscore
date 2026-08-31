import { describe, it, expect, vi } from 'vitest';

import { AIMode } from '../ai-mode';

import type { ILLMService } from '@/shared/interfaces/i-llm-service';
import type { HighlightData } from '@/shared/schemas/highlight-schema';

function makeProvider(): ILLMService {
  return {
    providerName: 'anthropic',
    capabilities: {
      contextWindow: 1,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsToolUse: false,
    },
    streamChat: vi.fn(async () => ({
      text: 'streamed',
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 1,
    })),
    chat: vi.fn(async () => ({
      text: 'summary text',
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 1,
    })),
    healthCheck: async () => ({ ok: true, model: 'x' }),
  };
}

const fakeHighlight = {
  id: 'h1',
  userId: undefined,
  text: 'highlight text',
  url: 'https://x.com',
  contentHash: 'abc',
  colorRole: 'yellow',
  type: 'underscore' as const,
  ranges: [
    {
      xpath: '//p',
      startOffset: 0,
      endOffset: 5,
      text: 'highl',
      textBefore: '',
      textAfter: '',
    },
  ],
  createdAt: new Date(),
} as unknown as HighlightData;

describe('AIMode', () => {
  it('generateSummary delegates to provider.chat', async () => {
    const provider = makeProvider();
    const mode = new AIMode({ provider });
    const result = await mode.generateSummary([fakeHighlight], 'short');
    expect(provider.chat).toHaveBeenCalled();
    expect(result).toBe('summary text');
  });

  it('generateQuestions returns an array', async () => {
    const provider: ILLMService = {
      ...makeProvider(),
      chat: vi.fn(async () => ({
        text: '["What is X?","How does Y work?"]',
        inputTokens: 1,
        outputTokens: 1,
        durationMs: 1,
      })),
    };
    const mode = new AIMode({ provider });
    const result = await mode.generateQuestions([fakeHighlight]);
    expect(result).toEqual(['What is X?', 'How does Y work?']);
  });
});
