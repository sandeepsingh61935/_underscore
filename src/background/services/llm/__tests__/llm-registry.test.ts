import { describe, it, expect, beforeEach } from 'vitest';

import { LLMRegistry } from '../llm-registry';

import type { ILLMService, ProviderName } from '@/shared/interfaces/i-llm-service';

function makeMockProvider(name: ProviderName): ILLMService {
  return {
    providerName: name,
    capabilities: {
      contextWindow: 8192,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsToolUse: false,
    },
    streamChat: async () => ({
      text: '',
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 0,
    }),
    chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
    healthCheck: async () => ({ ok: true, model: 'mock' }),
  };
}

describe('LLMRegistry', () => {
  let registry: LLMRegistry;

  beforeEach(() => {
    registry = new LLMRegistry();
  });

  it('registers and retrieves a provider by name', () => {
    const provider = makeMockProvider('anthropic');
    registry.register(provider);
    expect(registry.get('anthropic')).toBe(provider);
  });

  it('throws when getting an unregistered provider', () => {
    expect(() => registry.get('ollama')).toThrow(/not registered/);
  });

  it('lists registered providers with configured status', () => {
    registry.register(makeMockProvider('anthropic'));
    const list = registry.list();
    expect(list).toEqual([{ name: 'anthropic', configured: false }]);
  });

  it('marks a provider as configured after setConfigured', () => {
    registry.register(makeMockProvider('ollama'));
    registry.setConfigured('ollama', true);
    expect(registry.list()).toEqual([{ name: 'ollama', configured: true }]);
  });

  it('registers the standard in-app provider set', () => {
    registry.register(makeMockProvider('anthropic'));
    registry.register(makeMockProvider('openai'));
    registry.register(makeMockProvider('gemini'));
    registry.register(makeMockProvider('openrouter'));
    registry.register(makeMockProvider('ollama'));
    expect(registry.list()).toHaveLength(5);
    expect(registry.get('openai').providerName).toBe('openai');
    expect(registry.get('gemini').providerName).toBe('gemini');
  });
});
