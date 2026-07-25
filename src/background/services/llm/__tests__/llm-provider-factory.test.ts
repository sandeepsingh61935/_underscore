import { describe, it, expect, vi } from 'vitest';

import { resolveConfiguredProvider } from '../llm-provider-factory';

function makeRegistry() {
  return {
    get: vi.fn(() => { throw new Error('not registered'); }),
    list: () => [],
    setConfigured: vi.fn(),
  };
}

describe('resolveConfiguredProvider', () => {
  it('prefers the active provider over the default try order', async () => {
    const keyStore = {
      get: vi.fn(async (name: string) => (name === 'gemini' || name === 'openrouter' ? `key-${name}` : null)),
      getModel: vi.fn(async () => 'nvidia/nemotron-nano-9b-v2:free'),
      getActiveProvider: vi.fn(async () => 'openrouter' as const),
      getApiBase: vi.fn(async () => 'http://localhost:11434'),
      getOllamaVerified: vi.fn(async () => false),
    };

    const provider = await resolveConfiguredProvider(makeRegistry() as any, keyStore as any);
    expect(provider.providerName).toBe('openrouter');
    expect(keyStore.get).toHaveBeenCalledWith('openrouter');
    expect(keyStore.get).not.toHaveBeenCalledWith('gemini');
  });

  it('ignores a stale non-in-app active id and uses the next BYOK provider', async () => {
    const keyStore = {
      // getActiveProvider already sanitizes storage; simulate cleared active + openai key present.
      get: vi.fn(async (name: string) => (name === 'openai' ? 'sk-test' : null)),
      getModel: vi.fn(async () => 'gpt-4o-mini'),
      getActiveProvider: vi.fn(async () => null),
      getApiBase: vi.fn(async () => 'http://localhost:11434'),
      getOllamaVerified: vi.fn(async () => false),
    };

    const provider = await resolveConfiguredProvider(makeRegistry() as any, keyStore as any);
    expect(provider.providerName).toBe('openai');
  });

  it('rejects an explicit preferred value that is not an in-app provider', async () => {
    const keyStore = {
      get: vi.fn(async () => 'sk-test'),
      getModel: vi.fn(async () => 'gpt-4o-mini'),
      getActiveProvider: vi.fn(async () => null),
      getApiBase: vi.fn(async () => 'http://localhost:11434'),
      getOllamaVerified: vi.fn(async () => false),
    };

    await expect(
      resolveConfiguredProvider(makeRegistry() as any, keyStore as any, 'cursor' as any),
    ).rejects.toThrow(/No model configured/);
  });

  it('does not use OpenRouter without an API key even for free models', async () => {
    const keyStore = {
      get: vi.fn(async () => null),
      getModel: vi.fn(async () => 'meta-llama/llama-3.3-70b-instruct:free'),
      getActiveProvider: vi.fn(async () => 'openrouter' as const),
      getApiBase: vi.fn(async () => 'http://localhost:11434'),
      getOllamaVerified: vi.fn(async () => false),
    };

    await expect(
      resolveConfiguredProvider(makeRegistry() as any, keyStore as any),
    ).rejects.toThrow(/Configure AI providers/);
  });

  it('uses OpenRouter when a key is present', async () => {
    const keyStore = {
      get: vi.fn(async (name: string) => (name === 'openrouter' ? 'sk-or-test' : null)),
      getModel: vi.fn(async () => 'meta-llama/llama-3.3-70b-instruct:free'),
      getActiveProvider: vi.fn(async () => 'openrouter' as const),
      getApiBase: vi.fn(async () => 'http://localhost:11434'),
      getOllamaVerified: vi.fn(async () => false),
    };

    const provider = await resolveConfiguredProvider(makeRegistry() as any, keyStore as any);
    expect(provider.providerName).toBe('openrouter');
  });
});
