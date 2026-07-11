import { describe, it, expect } from 'vitest';

import { mapOpenRouterFreeModels } from '@/shared/llm/openrouter-models';

describe('openrouter-models', () => {
  it('keeps free :free models and zero-priced text models', () => {
    const models = mapOpenRouterFreeModels([
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
    ]);

    expect(models.map(m => m.id)).toEqual([
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ]);
    expect(models[0]?.hint).toBe('free');
  });
});
