import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface ProviderMeta {
  label: string;
  shortLabel: string;
  keyPlaceholder?: string;
  subscriptionNote?: string;
}

/** User-facing providers (MiniMax kept in type union for legacy configs only). */
export const SETUP_PROVIDERS: ReadonlyArray<ProviderName> = [
  'anthropic',
  'openai',
  'gemini',
  'cursor',
  'ollama',
  'openrouter',
];

export const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  anthropic: {
    label: 'Anthropic',
    shortLabel: 'Claude',
    keyPlaceholder: 'sk-ant-...',
    subscriptionNote: 'Claude Pro is separate from API billing. Use a key from console.anthropic.com.',
  },
  openai: {
    label: 'OpenAI',
    shortLabel: 'GPT',
    keyPlaceholder: 'sk-...',
    subscriptionNote: 'ChatGPT Plus is separate from API billing. Use a key from platform.openai.com.',
  },
  gemini: {
    label: 'Google',
    shortLabel: 'Gemini',
    keyPlaceholder: 'AIza...',
  },
  cursor: {
    label: 'Cursor',
    shortLabel: 'Cursor',
    keyPlaceholder: 'key_...',
  },
  openrouter: {
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    keyPlaceholder: 'sk-or-...',
  },
  ollama: { label: 'Ollama', shortLabel: 'Local' },
  minimax: { label: 'MiniMax', shortLabel: 'MiniMax', keyPlaceholder: 'eyJ...' },
};

export const CUSTOM_MODEL_ID = '__custom__';

export function providerStatusLabel(
  provider: ProviderName,
  configured: boolean | null,
): string {
  if (configured === null) return '…';
  if (provider === 'ollama') return configured ? 'Local' : 'Offline';
  if (provider === 'openrouter' && configured) return 'Ready';
  if (configured) return 'Connected';
  return 'Needs key';
}

export function formatModelDisplayName(modelId: string): string {
  return modelId
    .replace(/^claude-/i, 'Claude ')
    .replace(/^gpt-/i, 'GPT-')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
