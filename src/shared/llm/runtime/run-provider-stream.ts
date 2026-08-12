/**
 * Canonical ILLMService → LlmStreamEvent bridge (ADR-027 review cleanup).
 */

import type { ILLMService, LLMRequest } from '@/shared/interfaces/i-llm-service';
import type { LlmStreamEvent } from './stream-protocol';

export async function runProviderStream(
  provider: ILLMService,
  request: LLMRequest,
  onEvent: (event: LlmStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const result = await provider.streamChat(
      request,
      (chunk) => {
        if (chunk.delta) onEvent({ type: 'CHUNK', payload: { delta: chunk.delta } });
      },
      signal,
    );
    if (!signal.aborted) {
      onEvent({ type: 'DONE', payload: result });
    }
  } catch (err) {
    if (signal.aborted) return;
    const base = (err as Error).message || 'unknown error';
    onEvent({
      type: 'ERROR',
      payload: { message: `[${provider.providerName}] ${base}` },
    });
  }
}
