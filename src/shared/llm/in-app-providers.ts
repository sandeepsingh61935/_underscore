/**
 * Canonical in-app LLM providers for Ask / Summarize (BYOK + local).
 *
 * External agent hosts (Cursor, Claude Desktop, Codex, …) live under
 * Settings → Integrations (MCP bridge). They are never LLM backends here.
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';

/** Order used when no active provider is set (first configured wins). */
export const IN_APP_LLM_PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'gemini',
  'xai',
  'openrouter',
  'ollama',
] as const satisfies ReadonlyArray<ProviderName>;

const IN_APP_SET = new Set<string>(IN_APP_LLM_PROVIDER_ORDER);

export function isInAppLlmProvider(value: unknown): value is ProviderName {
  return typeof value === 'string' && IN_APP_SET.has(value);
}

/** Coerce storage / IPC values; drops legacy agent-host ids (cursor, minimax, …). */
export function parseInAppLlmProvider(value: unknown): ProviderName | null {
  return isInAppLlmProvider(value) ? value : null;
}
