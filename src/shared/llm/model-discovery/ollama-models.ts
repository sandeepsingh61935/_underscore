import type { ModelDiscoveryResult } from './types';

import type { ProviderModelOption } from '@/shared/llm/provider-models';

const DEFAULT_API_BASE = 'http://localhost:11434';

/** Fetch locally installed models via Ollama /api/tags (same as ollama JS SDK). */
export async function fetchOllamaModels(apiBase?: string): Promise<ModelDiscoveryResult> {
  const base = (apiBase?.trim() || DEFAULT_API_BASE).replace(/\/$/, '');

  try {
    const response = await fetch(`${base}/api/tags`);
    if (!response.ok) {
      return { models: [], error: `Ollama HTTP ${response.status}` };
    }
    const json = (await response.json()) as {
      models?: Array<{ name: string; details?: { family?: string } }>;
    };
    const models: ProviderModelOption[] = (json.models ?? [])
      .map((m) => ({
        id: m.name,
        label: m.name,
        hint: m.details?.family,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) {
      return { models: [], error: 'No models installed — run ollama pull <model>' };
    }
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
