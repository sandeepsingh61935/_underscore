import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import type { LLMKeyStore } from './llm-key-store';
import type { LLMRegistry } from './llm-registry';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider } from './openrouter-provider';

import type { ILLMService, ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
  parseInAppLlmProvider,
} from '@/shared/llm/in-app-providers';

const NO_PROVIDER_MESSAGE =
  'No model configured. Open Settings → Configure AI providers and add OpenAI, Anthropic, Gemini, OpenRouter, or Ollama.';

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
  if (!isInAppLlmProvider(provider)) {
    throw new Error(NO_PROVIDER_MESSAGE);
  }

  const model = modelOverride ?? await keyStore.getModel(provider);
  const resolvedApiBase = apiBase ?? (provider === 'ollama' ? await keyStore.getApiBase('ollama') : undefined);

  switch (provider) {
    case 'ollama':
      return new OllamaProvider({ apiBase: resolvedApiBase, model });
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
      // Cursor agent keys look like key_… — they are not OpenAI platform keys.
      if (/^key_/i.test(key.trim())) {
        throw new Error(
          'Stored key looks like a Cursor agent key, not an OpenAI API key. '
          + 'Clear it and paste a key from platform.openai.com, or use OpenRouter / Anthropic / Gemini / Ollama.',
        );
      }
      return new OpenAIProvider({ apiKey: key, model });
    }
    case 'openrouter': {
      const key = await keyStore.get(provider);
      // OpenRouter API always requires a key — free models only mean $0 credits.
      if (!key) {
        throw new Error(
          'OpenRouter API key required (free at openrouter.ai/keys). '
          + 'Free models do not charge credits but still need a key.',
        );
      }
      return new OpenRouterProvider({ apiKey: key, model });
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * Resolve the backend for in-app Ask / Summarize.
 * 1. Explicit preferred provider (if valid + configured)
 * 2. Active provider from settings
 * 3. First configured provider in {@link IN_APP_LLM_PROVIDER_ORDER}
 */
export async function resolveConfiguredProvider(
  registry: LLMRegistry,
  keyStore: LLMKeyStore,
  preferred?: ProviderName,
): Promise<ILLMService> {
  const preferredValid = parseInAppLlmProvider(preferred);
  if (preferred && !preferredValid) {
    throw new Error(NO_PROVIDER_MESSAGE);
  }

  if (preferredValid) {
    const registered = tryGetRegistered(registry, preferredValid);
    if (registered) return registered;
    return buildProvider(preferredValid, keyStore);
  }

  const active = await keyStore.getActiveProvider();
  if (active) {
    try {
      return await tryBuildConfigured(active, keyStore, registry);
    } catch {
      // Active misconfigured — fall through.
    }
  }

  for (const name of IN_APP_LLM_PROVIDER_ORDER) {
    try {
      return await tryBuildConfigured(name, keyStore, registry);
    } catch {
      // Try next.
    }
  }

  throw new Error(NO_PROVIDER_MESSAGE);
}

async function tryBuildConfigured(
  name: ProviderName,
  keyStore: LLMKeyStore,
  registry: LLMRegistry,
): Promise<ILLMService> {
  if (name === 'ollama') {
    // Only auto-select after the user completed Connect in setup (not bare localhost).
    if (!(await keyStore.getOllamaVerified())) {
      throw new Error('Ollama not configured');
    }
    const registered = tryGetRegistered(registry, name);
    if (registered) return registered;
    return buildProvider(name, keyStore);
  }
  if (name === 'openrouter') {
    if (!(await keyStore.get(name))) {
      throw new Error('OpenRouter not configured');
    }
    const registered = tryGetRegistered(registry, name);
    if (registered) return registered;
    return buildProvider(name, keyStore);
  }
  const key = await keyStore.get(name);
  if (!key) throw new Error('API key not configured');
  const registered = tryGetRegistered(registry, name);
  if (registered) return registered;
  return buildProvider(name, keyStore);
}
