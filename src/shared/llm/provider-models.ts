import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface ProviderModelOption {
  /** Model id sent to the provider API. */
  id: string;
  /** Human-readable label in the setup UI. */
  label: string;
  /** Optional hint (e.g. "free tier"). */
  hint?: string;
}

export interface ProviderModelCatalog {
  defaultModelId: string;
  models: ProviderModelOption[];
}

export const PROVIDER_MODEL_CATALOG: Record<ProviderName, ProviderModelCatalog> = {
  anthropic: {
    defaultModelId: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', hint: 'most capable' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'balanced' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'fast' },
    ],
  },
  openai: {
    defaultModelId: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', hint: 'low cost' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
  },
  gemini: {
    defaultModelId: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', hint: 'fast' },
      { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash (preview)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  openrouter: {
    defaultModelId: 'openrouter/free',
    models: [],
  },
  minimax: {
    defaultModelId: 'MiniMax-Text-01',
    models: [
      { id: 'MiniMax-Text-01', label: 'MiniMax Text 01' },
    ],
  },
  ollama: {
    defaultModelId: 'llama3.2',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2' },
      { id: 'llama3.1', label: 'Llama 3.1' },
      { id: 'mistral', label: 'Mistral' },
      { id: 'phi3', label: 'Phi-3' },
      { id: 'gemma2', label: 'Gemma 2' },
    ],
  },
};

export function getDefaultModelId(provider: ProviderName): string {
  return PROVIDER_MODEL_CATALOG[provider].defaultModelId;
}

export function getProviderModels(provider: ProviderName): ProviderModelOption[] {
  if (provider === 'openrouter') {
    return PROVIDER_MODEL_CATALOG.openrouter.models;
  }
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
