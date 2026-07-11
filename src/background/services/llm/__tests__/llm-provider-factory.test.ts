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
    };

    const provider = await resolveConfiguredProvider(makeRegistry() as any, keyStore as any);
    expect(provider.providerName).toBe('openrouter');
    expect(keyStore.get).toHaveBeenCalledWith('openrouter');
    expect(keyStore.get).not.toHaveBeenCalledWith('gemini');
  });
});
