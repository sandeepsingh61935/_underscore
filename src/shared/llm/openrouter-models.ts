import type { ProviderModelOption } from '@/shared/llm/provider-models';

const CACHE_KEY = 'llm.openrouter.modelsCache';
const CACHE_TTL_MS = 60 * 60 * 1000;
const MODELS_URL = 'https://openrouter.ai/api/v1/models';

/** Used when the public models API is unreachable. */
export const OPENROUTER_FALLBACK_MODELS: ProviderModelOption[] = [
  { id: 'openrouter/free', label: 'Free Models Router', hint: 'free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta Llama 3.3 70B Instruct', hint: 'free' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', label: 'NVIDIA Nemotron Nano 9B v2', hint: 'free' },
];

interface OpenRouterModelRecord {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { output_modalities?: string[] };
}

interface ModelsCacheEntry {
  fetchedAt: number;
  models: ProviderModelOption[];
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

/** Map OpenRouter API records to setup UI options (free text models only). */
export function mapOpenRouterFreeModels(records: OpenRouterModelRecord[]): ProviderModelOption[] {
  return records
    .filter(m => isFreeModel(m) && isTextModel(m))
    .map(m => ({
      id: m.id,
      label: m.name.replace(/\s*\(free\)\s*/gi, '').trim() || m.id,
      hint: 'free',
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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

/** Fetch free models from OpenRouter's public catalog (no API key). */
export async function fetchOpenRouterFreeModels(): Promise<ProviderModelOption[]> {
  const response = await fetch(MODELS_URL);
  if (!response.ok) throw new Error(`OpenRouter models HTTP ${response.status}`);
  const json = await response.json() as { data?: OpenRouterModelRecord[] };
  const models = mapOpenRouterFreeModels(json.data ?? []);
  if (models.length === 0) throw new Error('OpenRouter returned no free text models');
  return models;
}

/**
 * Free OpenRouter models for the setup UI.
 * Caches in chrome.storage.local for 1 hour (same idea as OpenCode plugins).
 */
export async function getOpenRouterModels(options: { refresh?: boolean } = {}): Promise<ProviderModelOption[]> {
  if (!options.refresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.models;
    }
  }

  try {
    const models = await fetchOpenRouterFreeModels();
    await writeCache(models);
    return models;
  } catch {
    const stale = await readCache();
    if (stale) return stale.models;
    return OPENROUTER_FALLBACK_MODELS;
  }
}
