import { fetchAnthropicModels } from './anthropic-models';
import { fetchGeminiModels } from './gemini-models';
import { fetchOllamaModels } from './ollama-models';
import { fetchOpenAIModels } from './openai-models';
import type { ModelDiscoveryInput, ModelDiscoveryResult } from './types';
import { fetchXaiModels } from './xai-models';

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';

export type { ModelDiscoveryInput, ModelDiscoveryResult };

/** Providers whose model catalog is fetched live (not hardcoded). */
export const DYNAMIC_MODEL_PROVIDERS: ReadonlyArray<ProviderName> = [
  'anthropic',
  'openai',
  'gemini',
  'xai',
  'ollama',
  'openrouter',
];

export async function fetchProviderModels(
  provider: ProviderName,
  input: ModelDiscoveryInput = {}
): Promise<ModelDiscoveryResult> {
  if (!isInAppLlmProvider(provider)) {
    return { models: [], error: 'Unknown provider' };
  }

  switch (provider) {
    case 'anthropic':
      return fetchAnthropicModels(input.apiKey ?? '');
    case 'openai':
      return fetchOpenAIModels(input.apiKey ?? '');
    case 'gemini':
      return fetchGeminiModels(input.apiKey ?? '');
    case 'xai':
      return fetchXaiModels(input.apiKey ?? '');
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
    default: {
      const exhaustive: never = provider;
      return { models: [], error: `Unknown provider: ${String(exhaustive)}` };
    }
  }
}
