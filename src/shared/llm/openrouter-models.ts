import { getProviderModels, type ProviderModelOption } from '@/shared/llm/provider-models';

const CACHE_KEY = 'llm.openrouter.modelsCache';
const CACHE_TTL_MS = 60 * 60 * 1000;
const MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Used when the public models API is unreachable.
 * `hint: 'free'` = $0 inference credits. OpenRouter still requires an API key
 * for chat (free to create at openrouter.ai/keys) — browser cookie auth is not available in the extension.
 */
export const OPENROUTER_FALLBACK_MODELS: ProviderModelOption[] = getProviderModels('openrouter');

export interface OpenRouterModelRecord {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { output_modalities?: string[] };
}

interface ModelsCacheEntry {
  fetchedAt: number;
  models: ProviderModelOption[];
}

export function isOpenRouterModelFree(modelId: string): boolean {
  if (modelId.endsWith(':free') || modelId === 'openrouter/free') return true;
  return false;
}

function isFreeModel(model: OpenRouterModelRecord): boolean {
  if (model.id.endsWith(':free')) return true;
  const prompt = Number(model.pricing?.prompt ?? NaN);
  const completion = Number(model.pricing?.completion ?? NaN);
  return prompt === 0 && completion === 0;
}

function isTextModel(model: OpenRouterModelRecord): boolean {
  const outputs = model.architecture?.output_modalities;
  return !outputs || outputs.includes('text');
}

/** Map OpenRouter API records to setup UI options (all text models, tagged free/paid). */
export function mapOpenRouterModels(records: OpenRouterModelRecord[]): ProviderModelOption[] {
  return records
    .filter(m => isTextModel(m))
    .map(m => {
      const free = isFreeModel(m);
      return {
        id: m.id,
        label: m.name.replace(/\s*\(free\)\s*/gi, '').trim() || m.id,
        hint: free ? 'free' : 'paid',
        // API auth is always required; free only means $0 credits.
        requiresKey: true,
      };
    })
    .sort((a, b) => {
      const aFree = a.hint === 'free' ? 0 : 1;
      const bFree = b.hint === 'free' ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return a.label.localeCompare(b.label);
    });
}

/** @deprecated Use mapOpenRouterModels — kept for existing tests. */
export function mapOpenRouterFreeModels(records: OpenRouterModelRecord[]): ProviderModelOption[] {
  return mapOpenRouterModels(records).filter(m => m.hint === 'free');
}

async function readCache(): Promise<ModelsCacheEntry | null> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
  const result = await chrome.storage.local.get(CACHE_KEY);
  const entry = result[CACHE_KEY] as ModelsCacheEntry | undefined;
  if (!entry || !Array.isArray(entry.models) || entry.models.length === 0) return null;
  return entry;
}

async function writeCache(models: ProviderModelOption[]): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({
    [CACHE_KEY]: { fetchedAt: Date.now(), models } satisfies ModelsCacheEntry,
  });
}

/** Fetch all text models from OpenRouter's public catalog (no API key). */
export async function fetchOpenRouterModels(): Promise<ProviderModelOption[]> {
  const response = await fetch(MODELS_URL);
  if (!response.ok) throw new Error(`OpenRouter models HTTP ${response.status}`);
  const json = await response.json() as { data?: OpenRouterModelRecord[] };
  const models = mapOpenRouterModels(json.data ?? []);
  if (models.length === 0) throw new Error('OpenRouter returned no text models');
  return models;
}

/** OpenRouter models for the setup UI. Cached in chrome.storage.local for 1 hour. */
export async function getOpenRouterModels(options: { refresh?: boolean } = {}): Promise<ProviderModelOption[]> {
  if (!options.refresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.models;
    }
  }

  try {
    const models = await fetchOpenRouterModels();
    await writeCache(models);
    return models;
  } catch {
    const stale = await readCache();
    if (stale) return stale.models;
    return OPENROUTER_FALLBACK_MODELS;
  }
}

/**
 * Whether chat/completions needs an OpenRouter API key.
 * Always true: OpenRouter rejected keyless API calls (401 cookie/auth) as of 2026.
 * `:free` models still need a key from openrouter.ai/keys — they just do not charge credits.
 * `catalog` kept for call-site compatibility.
 */
export function openRouterModelRequiresKey(
  _modelId: string,
  _catalog?: ProviderModelOption[],
): boolean {
  return true;
}

/** Short helper — auth required even when inference is free. */
export const OPENROUTER_KEY_HELP = 'Key from openrouter.ai/keys · free models use $0 credits';
