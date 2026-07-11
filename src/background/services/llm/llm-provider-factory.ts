import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import type { LLMKeyStore } from './llm-key-store';
import type { LLMRegistry } from './llm-registry';
import { MiniMaxProvider } from './minimax-provider';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider } from './openrouter-provider';

import type { ILLMService, ProviderName } from '@/shared/interfaces/i-llm-service';

/** First provider with a configured key wins when none is specified. */
const PROVIDER_TRY_ORDER: ReadonlyArray<ProviderName> = [
  'gemini',
  'anthropic',
  'openai',
  'openrouter',
  'minimax',
  'ollama',
];

export function tryGetRegistered(registry: LLMRegistry, name: ProviderName): ILLMService | null {
  try {
    return registry.get(name);
  } catch {
    return null;
  }
}

export async function buildProvider(
  provider: ProviderName,
  keyStore: LLMKeyStore,
  apiBase?: string,
  modelOverride?: string,
): Promise<ILLMService> {
  const model = modelOverride ?? await keyStore.getModel(provider);

  switch (provider) {
    case 'ollama':
      return new OllamaProvider({ apiBase, model });
    case 'anthropic': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      return new AnthropicProvider({ apiKey: key, model });
    }
    case 'gemini': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      return new GeminiProvider({ apiKey: key, model });
    }
    case 'openai': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      return new OpenAIProvider({ apiKey: key, model });
    }
    case 'openrouter': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      return new OpenRouterProvider({ apiKey: key, model });
    }
    case 'minimax': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      return new MiniMaxProvider({ apiKey: key, model });
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}

export async function resolveConfiguredProvider(
  registry: LLMRegistry,
  keyStore: LLMKeyStore,
  preferred?: ProviderName,
): Promise<ILLMService> {
  if (preferred) {
    const registered = tryGetRegistered(registry, preferred);
    if (registered) return registered;
    return buildProvider(preferred, keyStore);
  }

  const active = await keyStore.getActiveProvider();
  if (active) {
    try {
      if (active === 'ollama') return await buildProvider(active, keyStore);
      const key = await keyStore.get(active);
      if (key) return await buildProvider(active, keyStore);
    } catch {
      // Active provider misconfigured — fall through to discovery order.
    }
  }

  for (const name of PROVIDER_TRY_ORDER) {
    try {
      if (name === 'ollama') return await buildProvider(name, keyStore);
      const key = await keyStore.get(name);
      if (key) return await buildProvider(name, keyStore);
    } catch {
      // Try the next provider in the preference order.
    }
  }

  throw new Error('No LLM provider configured. Add an API key in Settings.');
}
