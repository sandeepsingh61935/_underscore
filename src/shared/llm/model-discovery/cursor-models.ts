import type { ProviderModelOption } from '@/shared/llm/provider-models';

import type { ModelDiscoveryResult } from './types';

const MODELS_URL = 'https://api.cursor.com/v1/models';

function basicAuth(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

/** Fetch models from Cursor Cloud Agents API (GET /v1/models). */
export async function fetchCursorModels(apiKey: string): Promise<ModelDiscoveryResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { models: [], error: 'API key required to load models' };

  try {
    const response = await fetch(MODELS_URL, {
      headers: { authorization: basicAuth(trimmed) },
    });
    if (!response.ok) {
      return { models: [], error: `Cursor models HTTP ${response.status}` };
    }
    const json = await response.json() as {
      items?: Array<{ id: string; displayName?: string }>;
    };
    const models: ProviderModelOption[] = (json.items ?? [])
      .map(m => ({
        id: m.id,
        label: m.displayName ?? m.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) return { models: [], error: 'No models returned' };
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
