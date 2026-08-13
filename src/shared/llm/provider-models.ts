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

/** Snapshot used when live discovery has not run. Live lists replace it; they are not merged. */
export const PROVIDER_MODEL_CATALOG: Record<ProviderName, ProviderModelCatalog> = {
  anthropic: {
    defaultModelId: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
  openai: {
    defaultModelId: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'o4-mini', label: 'o4-mini' },
      { id: 'o3', label: 'o3' },
    ],
  },
  gemini: {
    defaultModelId: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
  },
  xai: {
    defaultModelId: 'grok-4.5',
    models: [
      { id: 'grok-4.5', label: 'Grok 4.5' },
      { id: 'grok-4', label: 'Grok 4' },
      { id: 'grok-3', label: 'Grok 3' },
      { id: 'grok-3-mini', label: 'Grok 3 Mini' },
    ],
  },
  openrouter: {
    // Concrete free model — "openrouter/free" is not a reliable chat model id.
    defaultModelId: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'Meta Llama 3.3 70B Instruct',
        hint: 'free',
        requiresKey: true,
      },
      {
        id: 'nvidia/nemotron-nano-9b-v2:free',
        label: 'NVIDIA Nemotron Nano 9B v2',
        hint: 'free',
        requiresKey: true,
      },
      {
        id: 'google/gemma-3-27b-it:free',
        label: 'Google Gemma 3 27B',
        hint: 'free',
        requiresKey: true,
      },
    ],
  },
  ollama: {
    defaultModelId: 'llama3.2',
    models: [
      { id: 'llama3.2', label: 'llama3.2' },
      { id: 'llama3.1', label: 'llama3.1' },
      { id: 'mistral', label: 'mistral' },
      { id: 'qwen2.5', label: 'qwen2.5' },
    ],
  },
};

export function getDefaultModelId(provider: ProviderName): string {
  return PROVIDER_MODEL_CATALOG[provider].defaultModelId;
}

export function getProviderModels(provider: ProviderName): ProviderModelOption[] {
  return PROVIDER_MODEL_CATALOG[provider].models;
}

/** `null`/`undefined` = unknown (use snapshot). `[]` = known empty. */
export function resolveCatalogModels(
  provider: ProviderName,
  live: readonly ProviderModelOption[] | null | undefined,
): ProviderModelOption[] {
  if (live == null) return [...getProviderModels(provider)];
  return [...live];
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
