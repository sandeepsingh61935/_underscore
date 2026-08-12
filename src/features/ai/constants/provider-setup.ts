import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';

export interface ProviderMeta {
  label: string;
  shortLabel: string;
  keyPlaceholder?: string;
  /** One-line context under the title — keep under ~50 chars. */
  blurb?: string;
}

/**
 * In-app model providers for Ask / Summarize (BYOK or local Ollama).
 * Agent apps (Cursor, Claude Desktop, …) are Settings → Integrations only.
 */
export const SETUP_PROVIDERS: ReadonlyArray<ProviderName> = IN_APP_LLM_PROVIDER_ORDER;

export const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  anthropic: {
    label: 'Anthropic',
    shortLabel: 'Claude',
    keyPlaceholder: 'sk-ant-…',
    blurb: 'console.anthropic.com',
  },
  openai: {
    label: 'OpenAI',
    shortLabel: 'GPT',
    keyPlaceholder: 'sk-…',
    blurb: 'platform.openai.com',
  },
  gemini: {
    label: 'Google',
    shortLabel: 'Gemini',
    keyPlaceholder: 'AIza…',
    blurb: 'aistudio.google.com',
  },
  openrouter: {
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    keyPlaceholder: 'sk-or-…',
    blurb: 'Key required · free models use $0 credits',
  },
  ollama: {
    label: 'Ollama',
    shortLabel: 'Local',
    blurb: 'Runs on this machine',
  },
};

export const CUSTOM_MODEL_ID = '__custom__';

export function providerStatusLabel(
  provider: ProviderName,
  configured: boolean | null,
): string {
  if (configured === null) return '…';
  if (provider === 'ollama') return configured ? 'On' : 'Off';
  if (configured) return 'On';
  return 'Off';
}

export function formatModelDisplayName(modelId: string): string {
  return modelId
    .replace(/^claude-/i, 'Claude ')
    .replace(/^gpt-/i, 'GPT-')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
