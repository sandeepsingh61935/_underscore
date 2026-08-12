/**
 * Minimal LLMRequest validation for proxy edge (ADR-027).
 */

import type { LLMMessage, LLMRequest } from '@/shared/interfaces/i-llm-service';

function isMessage(value: unknown): value is LLMMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (
    (m['role'] === 'user' || m['role'] === 'assistant')
    && typeof m['content'] === 'string'
  );
}

/** Returns a validated LLMRequest or null. */
export function parseLlmRequest(value: unknown): LLMRequest | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v['systemPrompt'] !== 'string') return null;
  if (typeof v['maxTokens'] !== 'number' || !Number.isFinite(v['maxTokens'])) return null;
  if (!Array.isArray(v['messages']) || v['messages'].length === 0) return null;
  if (!v['messages'].every(isMessage)) return null;

  const request: LLMRequest = {
    systemPrompt: v['systemPrompt'],
    messages: v['messages'] as LLMMessage[],
    maxTokens: v['maxTokens'],
  };
  if (typeof v['temperature'] === 'number' && Number.isFinite(v['temperature'])) {
    request.temperature = v['temperature'];
  }
  if (Array.isArray(v['stopSequences']) && v['stopSequences'].every((s) => typeof s === 'string')) {
    request.stopSequences = v['stopSequences'] as string[];
  }
  return request;
}
