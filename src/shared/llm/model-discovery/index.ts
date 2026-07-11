import type { ProviderName } from '@/shared/interfaces/i-llm-service';

import { fetchAnthropicModels } from './anthropic-models';
import { fetchCursorModels } from './cursor-models';
import { fetchGeminiModels } from './gemini-models';
import { fetchOllamaModels } from './ollama-models';
import { fetchOpenAIModels } from './openai-models';
import type { ModelDiscoveryInput, ModelDiscoveryResult } from './types';

export type { ModelDiscoveryInput, ModelDiscoveryResult };

/** Providers whose model catalog is fetched live (not hardcoded). */
export const DYNAMIC_MODEL_PROVIDERS: ReadonlyArray<ProviderName> = [
  'anthropic',
  'openai',
  'gemini',
  'cursor',
  'ollama',
  'openrouter',
];

export async function fetchProviderModels(
  provider: ProviderName,
  input: ModelDiscoveryInput = {},
): Promise<ModelDiscoveryResult> {
  switch (provider) {
    case 'anthropic':
      return fetchAnthropicModels(input.apiKey ?? '');
    case 'openai':
      return fetchOpenAIModels(input.apiKey ?? '');
    case 'gemini':
      return fetchGeminiModels(input.apiKey ?? '');
    case 'cursor':
      return fetchCursorModels(input.apiKey ?? '');
    case 'ollama':
      return fetchOllamaModels(input.apiBase);
    case 'openrouter': {
      const { getOpenRouterModels } = await import('@/shared/llm/openrouter-models');
      try {
        const models = await getOpenRouterModels();
        return { models };
      } catch (err) {
        return { models: [], error: (err as Error).message };
      }
    }
    case 'minimax':
      return { models: [], error: 'MiniMax is deprecated in setup UI' };
    default: {
      const exhaustive: never = provider;
      return { models: [], error: `Unknown provider: ${String(exhaustive)}` };
    }
  }
}
