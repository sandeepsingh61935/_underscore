import { describe, it, expect } from 'vitest';

import { mapOpenRouterModels, mapOpenRouterFreeModels, openRouterModelRequiresKey } from '@/shared/llm/openrouter-models';

describe('openrouter-models', () => {
  const sampleRecords = [
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Meta: Llama 3.3 70B Instruct (free)',
    },
    {
      id: 'openrouter/free',
      name: 'Free Models Router',
      pricing: { prompt: '0', completion: '0' },
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      pricing: { prompt: '0.0000025', completion: '0.00001' },
    },
    {
      id: 'google/lyria-3-pro-preview',
      name: 'Lyria preview',
      pricing: { prompt: '0', completion: '0' },
      architecture: { output_modalities: ['audio'] },
    },
  ];

  it('lists free and paid text models with hints', () => {
    const models = mapOpenRouterModels(sampleRecords);
    expect(models.map(m => m.id)).toEqual([
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'openai/gpt-4o',
    ]);
    expect(models[0]?.hint).toBe('free');
    expect(models[2]?.hint).toBe('paid');
    expect(models[2]?.requiresKey).toBe(true);
  });

  it('mapOpenRouterFreeModels keeps only free models', () => {
    const models = mapOpenRouterFreeModels(sampleRecords);
    expect(models.map(m => m.id)).toEqual([
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ]);
  });

  it('openRouterModelRequiresKey is false for free ids', () => {
    expect(openRouterModelRequiresKey('openrouter/free')).toBe(false);
    expect(openRouterModelRequiresKey('meta-llama/llama-3.3-70b-instruct:free')).toBe(false);
    expect(openRouterModelRequiresKey('openai/gpt-4o')).toBe(true);
  });
});
