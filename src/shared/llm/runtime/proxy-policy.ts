/**
 * Web LLM proxy policy constants (ADR-027).
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';

/** Cloud providers must go through the Pages Function on web. */
export const CLOUD_LLM_PROVIDERS: readonly ProviderName[] = [
  'openai',
  'anthropic',
  'gemini',
  'xai',
  'openrouter',
] as const;

export function isCloudLlmProvider(provider: ProviderName): boolean {
  return provider !== 'ollama' && isInAppLlmProvider(provider);
}

export function usesWebProxy(provider: ProviderName): boolean {
  return isCloudLlmProvider(provider);
}

/** Max JSON body size for /api/llm/* (bytes). */
export const LLM_PROXY_MAX_BODY_BYTES = 512 * 1024;

/** Max stream duration (ms). */
export const LLM_PROXY_MAX_STREAM_MS = 120_000;

/** Stream starts per user per hour. */
export const LLM_PROXY_RATE_LIMIT_PER_HOUR = 30;

/** Soft burst: max starts per minute. */
export const LLM_PROXY_RATE_LIMIT_PER_MINUTE = 5;

/** Max concurrent streams per user. */
export const LLM_PROXY_MAX_CONCURRENT = 1;

/** Fixed API path for stream (same origin as SPA). */
export const LLM_PROXY_STREAM_PATH = '/api/llm/stream';

/** Fixed API path for health. */
export const LLM_PROXY_HEALTH_PATH = '/api/llm/health';
