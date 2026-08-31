import type { ModelDiscoveryResult } from './types';

import type { ProviderModelOption } from '@/shared/llm/provider-models';

const MODELS_URL = 'https://api.anthropic.com/v1/models';

/** Fetch available models via Anthropic REST API (same catalog as @anthropic-ai/sdk). */
export async function fetchAnthropicModels(
  apiKey: string
): Promise<ModelDiscoveryResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { models: [], error: 'API key required to load models' };

  try {
    const response = await fetch(MODELS_URL, {
      headers: {
        'x-api-key': trimmed,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!response.ok) {
      return { models: [], error: `Anthropic models HTTP ${response.status}` };
    }
    const json = (await response.json()) as {
      data?: Array<{ id: string; display_name?: string }>;
    };
    const models: ProviderModelOption[] = (json.data ?? [])
      .map((m) => ({
        id: m.id,
        label: m.display_name ?? m.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) return { models: [], error: 'No models returned' };
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
