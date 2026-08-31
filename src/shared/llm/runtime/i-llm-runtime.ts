/**
 * Platform-agnostic LLM stream runtime (ADR-027).
 * Feature hooks depend on this — not chrome.runtime.
 * Non-stream chat stays on sendLlmChat / IPC (extension), not this port.
 */

import type { LlmStreamEvent } from './stream-protocol';

import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';

export interface LlmStreamArgs {
  request: LLMRequest;
  provider?: ProviderName;
}

export interface ILlmRuntime {
  /**
   * Stream a completion. Invokes onEvent for CHUNK / DONE / ERROR.
   * Provider failures should be ERROR events (not thrown), except unexpected local faults.
   */
  streamChat(
    args: LlmStreamArgs,
    onEvent: (event: LlmStreamEvent) => void,
    signal: AbortSignal
  ): Promise<void>;
}
