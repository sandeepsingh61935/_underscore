/**
 * Bridges an LLM provider's streamChat() to a chrome.runtime.Port from the popup.
 * On port disconnect, aborts the in-flight fetch via AbortController (ADR-021 §6).
 */

import type { ILLMService, LLMRequest } from '@/shared/interfaces/i-llm-service';
import { runProviderStream } from '@/shared/llm/runtime/run-provider-stream';

interface StreamingPort {
  postMessage: (msg: { type: string; payload?: unknown }) => void;
  onDisconnect: { addListener: (cb: () => void) => void };
}

export async function handleStreamChat(
  port: StreamingPort,
  provider: ILLMService,
  request: LLMRequest,
): Promise<void> {
  const controller = new AbortController();
  let disconnected = false;

  port.onDisconnect.addListener(() => {
    disconnected = true;
    controller.abort();
  });

  await runProviderStream(
    provider,
    request,
    (event) => {
      if (disconnected) return;
      try {
        port.postMessage(event);
      } catch {
        controller.abort();
      }
    },
    controller.signal,
  );
}
