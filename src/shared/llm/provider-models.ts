import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface ProviderModelOption {
  /** Model id sent to the provider API. */
  id: string;
  /** Human-readable label in the setup UI. */
  label: string;
  /** Optional hint (e.g. "free", "paid"). */
  hint?: string;
  /** When false, provider works without an API key (OpenRouter free tier). */
  requiresKey?: boolean;
}

export interface ProviderModelCatalog {
  defaultModelId: string;
  models: ProviderModelOption[];
}

export const PROVIDER_MODEL_CATALOG: Record<ProviderName, ProviderModelCatalog> = {
  anthropic: {
    defaultModelId: 'claude-sonnet-4-6',
    models: [],
  },
  openai: {
    defaultModelId: 'gpt-4o-mini',
    models: [],
  },
  gemini: {
    defaultModelId: 'gemini-2.0-flash',
    models: [],
  },
  xai: {
    defaultModelId: 'grok-4.5',
    models: [],
  },
  openrouter: {
    // Concrete free model — "openrouter/free" is not a reliable chat model id.
    defaultModelId: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [],
  },
  ollama: {
    defaultModelId: 'llama3.2',
    models: [],
  },
};

export function getDefaultModelId(provider: ProviderName): string {
  return PROVIDER_MODEL_CATALOG[provider].defaultModelId;
}

export function getProviderModels(provider: ProviderName): ProviderModelOption[] {
  return PROVIDER_MODEL_CATALOG[provider].models;
}

export function resolveProviderModel(provider: ProviderName, stored: string | null | undefined): string {
  const trimmed = stored?.trim();
  if (trimmed) return trimmed;
  return getDefaultModelId(provider);
}

export function findCatalogModel(
  provider: ProviderName,
  modelId: string,
): ProviderModelOption | undefined {
  return PROVIDER_MODEL_CATALOG[provider].models.find(m => m.id === modelId);
}
