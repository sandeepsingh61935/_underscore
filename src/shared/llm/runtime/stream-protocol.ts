/**
 * Platform-agnostic LLM stream protocol (Port + SSE).
 * ADR-027
 */

import type { LLMResult } from '@/shared/interfaces/i-llm-service';

export type LlmStreamEvent =
  | { type: 'CHUNK'; payload: { delta: string } }
  | { type: 'DONE'; payload: LLMResult }
  | { type: 'ERROR'; payload: { message: string } };

export function isLlmStreamEvent(value: unknown): value is LlmStreamEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as { type?: unknown; payload?: unknown };
  if (v.type === 'CHUNK') {
    const p = v.payload as { delta?: unknown } | undefined;
    return typeof p?.delta === 'string';
  }
  if (v.type === 'DONE') return v.payload !== undefined && typeof v.payload === 'object';
  if (v.type === 'ERROR') {
    const p = v.payload as { message?: unknown } | undefined;
    return typeof p?.message === 'string' || p?.message === undefined;
  }
  return false;
}
