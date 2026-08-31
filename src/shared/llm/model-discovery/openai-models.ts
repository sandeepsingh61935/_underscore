import type { ModelDiscoveryResult } from './types';

import type { ProviderModelOption } from '@/shared/llm/provider-models';

const MODELS_URL = 'https://api.openai.com/v1/models';

/** Chat-capable OpenAI model id prefixes (matches official SDK model listing). */
const CHAT_PREFIXES = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt-'];

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (lower.includes('instruct') && !lower.startsWith('gpt-')) return false;
  if (
    /^(text-|davinci|babbage|whisper|tts|dall-e|embedding|omni-moderation|gpt-image|sora|computer-use)/.test(
      lower
    )
  ) {
    return false;
  }
  return CHAT_PREFIXES.some((p) => lower.startsWith(p));
}

function formatLabel(id: string): string {
  return id
    .replace(/^gpt-/i, 'GPT-')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Fetch available chat models via OpenAI REST API (same catalog as openai SDK). */
export async function fetchOpenAIModels(apiKey: string): Promise<ModelDiscoveryResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { models: [], error: 'API key required to load models' };

  try {
    const response = await fetch(MODELS_URL, {
      headers: { authorization: `Bearer ${trimmed}` },
    });
    if (!response.ok) {
      return { models: [], error: `OpenAI models HTTP ${response.status}` };
    }
    const json = (await response.json()) as { data?: Array<{ id: string }> };
    const models: ProviderModelOption[] = (json.data ?? [])
      .filter((m) => isChatModel(m.id))
      .map((m) => ({ id: m.id, label: formatLabel(m.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) return { models: [], error: 'No chat models returned' };
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}
