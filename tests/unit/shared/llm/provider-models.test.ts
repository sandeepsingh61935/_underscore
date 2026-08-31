import { describe, it, expect } from 'vitest';

import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';
import {
  getDefaultModelId,
  getProviderModels,
  resolveProviderModel,
} from '@/shared/llm/provider-models';

describe('provider-models', () => {
  it('returns catalog default per provider', () => {
    expect(getDefaultModelId('openrouter')).toBe(
      'meta-llama/llama-3.3-70b-instruct:free'
    );
    expect(getDefaultModelId('anthropic')).toBe('claude-sonnet-4-6');
  });

  it('resolveProviderModel prefers stored value', () => {
    expect(resolveProviderModel('openrouter', 'nvidia/nemotron-nano-9b-v2:free')).toBe(
      'nvidia/nemotron-nano-9b-v2:free'
    );
    expect(resolveProviderModel('openrouter', null)).toBe(
      getDefaultModelId('openrouter')
    );
  });

  it('ships a non-empty in-app catalog for every BYOK + Ollama provider', () => {
    for (const provider of IN_APP_LLM_PROVIDER_ORDER) {
      const models = getProviderModels(provider);
      expect(models.length, provider).toBeGreaterThanOrEqual(2);
      expect(
        models.some((m) => m.id === getDefaultModelId(provider)),
        provider
      ).toBe(true);
      expect(new Set(models.map((m) => m.id)).size, provider).toBe(models.length);
      for (const model of models) {
        expect(model.id.trim().length, `${provider}:${model.id}`).toBeGreaterThan(0);
        expect(model.label.trim().length, `${provider}:${model.id}`).toBeGreaterThan(0);
      }
    }
  });
});
