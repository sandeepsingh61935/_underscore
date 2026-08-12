/**
 * Platform-agnostic LLM stream/chat runtime (ADR-027).
 * Feature hooks depend on this — not chrome.runtime.
 */

import type { LLMRequest, LLMResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import type { LlmStreamEvent } from './stream-protocol';

export interface LlmStreamArgs {
  request: LLMRequest;
  provider?: ProviderName;
}

export interface ILlmRuntime {
  /**
   * Stream a completion. Invokes onEvent for CHUNK / DONE / ERROR.
   * Rejects only on unexpected local failures; provider errors should be ERROR events.
   */
  streamChat(
    args: LlmStreamArgs,
    onEvent: (event: LlmStreamEvent) => void,
    signal: AbortSignal,
  ): Promise<void>;

  /**
   * Optional non-stream chat. Default adapters may implement via stream aggregation
   * or platform IPC.
   */
  chat?(
    args: LlmStreamArgs,
    signal?: AbortSignal,
  ): Promise<LLMResult>;
}
