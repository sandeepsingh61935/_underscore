import type { LLMKeyStore } from './llm-key-store';
import type { LLMRegistry } from './llm-registry';

import type { ILLMService, ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
  parseInAppLlmProvider,
} from '@/shared/llm/in-app-providers';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';
import {
  ensureLlmOrigin,
  ensureOllamaOrigins,
} from '@/shared/permissions/ensure-origins';

const NO_PROVIDER_MESSAGE =
  'No model configured. Open Settings → Models & providers and add OpenAI, Anthropic, Gemini, xAI (Grok), OpenRouter, or Ollama.';

export function tryGetRegistered(
  registry: LLMRegistry,
  name: ProviderName
): ILLMService | null {
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
  modelOverride?: string
): Promise<ILLMService> {
  if (!isInAppLlmProvider(provider)) {
    throw new Error(NO_PROVIDER_MESSAGE);
  }

  const originOk =
    provider === 'ollama' ? await ensureOllamaOrigins() : await ensureLlmOrigin(provider);
  if (!originOk) {
    throw new Error('Permission to reach this AI provider was denied');
  }

  const model = modelOverride ?? (await keyStore.getModel(provider));
  const resolvedApiBase =
    apiBase ?? (provider === 'ollama' ? await keyStore.getApiBase('ollama') : undefined);
  const apiKey =
    provider === 'ollama' ? undefined : ((await keyStore.get(provider)) ?? undefined);

  return buildProviderFromConfig({
    provider,
    apiKey,
    apiBase: resolvedApiBase,
    model: model ?? undefined,
  });
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
  preferred?: ProviderName
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
  registry: LLMRegistry
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
