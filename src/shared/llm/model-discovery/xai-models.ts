import type { ModelDiscoveryResult } from './types';

import type { ProviderModelOption } from '@/shared/llm/provider-models';

const MODELS_URL = 'https://api.x.ai/v1/models';

function formatLabel(id: string): string {
  return id
    .replace(/^grok-/i, 'Grok ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Chat models via xAI OpenAI-compatible /v1/models. */
export async function fetchXaiModels(apiKey: string): Promise<ModelDiscoveryResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { models: [], error: 'API key required to load models' };

  try {
    const response = await fetch(MODELS_URL, {
      headers: { authorization: `Bearer ${trimmed}` },
    });
    if (!response.ok) {
      return { models: [], error: `xAI models HTTP ${response.status}` };
    }
    const json = (await response.json()) as { data?: Array<{ id: string }> };
    const models: ProviderModelOption[] = (json.data ?? [])
      .filter((m) => /^grok/i.test(m.id))
      .map((m) => ({ id: m.id, label: formatLabel(m.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) {
      // API may return other ids — fall back to any listed model.
      const fallback: ProviderModelOption[] = (json.data ?? [])
        .map((m) => ({ id: m.id, label: formatLabel(m.id) }))
        .sort((a, b) => a.label.localeCompare(b.label));
      if (fallback.length === 0) return { models: [], error: 'No models returned' };
      return { models: fallback };
    }
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
