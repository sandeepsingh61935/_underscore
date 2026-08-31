import { describe, expect, it } from 'vitest';

import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';

describe('buildProviderFromConfig', () => {
  it('builds ollama without api key', () => {
    const p = buildProviderFromConfig({ provider: 'ollama', model: 'llama3.2' });
    expect(p.providerName).toBe('ollama');
  });

  it('requires api key for openai', () => {
    expect(() => buildProviderFromConfig({ provider: 'openai' })).toThrow(/API key/i);
  });

  it('rejects cursor-looking openai keys', () => {
    expect(() =>
      buildProviderFromConfig({ provider: 'openai', apiKey: 'key_abc' })
    ).toThrow(/Cursor/i);
  });

  it('builds openai with key', () => {
    const p = buildProviderFromConfig({
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });
    expect(p.providerName).toBe('openai');
  });
});
