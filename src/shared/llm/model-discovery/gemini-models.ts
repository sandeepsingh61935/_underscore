import type { ProviderModelOption } from '@/shared/llm/provider-models';

import type { ModelDiscoveryResult } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function parseModelId(fullId: string): string {
  return fullId.replace(/^models\//, '');
}

function formatLabel(id: string): string {
  return id
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Fetch generateContent-capable models via Gemini REST API (same as @google/generative-ai). */
export async function fetchGeminiModels(apiKey: string): Promise<ModelDiscoveryResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { models: [], error: 'API key required to load models' };

  try {
    const url = `${API_BASE}/models?key=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { models: [], error: `Gemini models HTTP ${response.status}` };
    }
    const json = await response.json() as {
      models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>;
    };
    const models: ProviderModelOption[] = (json.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => {
        const id = parseModelId(m.name);
        return { id, label: m.displayName ?? formatLabel(id) };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) return { models: [], error: 'No generative models returned' };
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
