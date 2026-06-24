/**
 * Bridges an LLM provider's streamChat() to a chrome.runtime.Port from the popup.
 * On port disconnect, aborts the in-flight fetch via AbortController (ADR-021 §6).
 */

import type { ILLMService, LLMRequest, LLMResult } from '@/shared/interfaces/i-llm-service';

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

  try {
    const result = await provider.streamChat(
      request,
      chunk => {
        if (disconnected) return;
        try { port.postMessage({ type: 'CHUNK', payload: chunk }); }
        catch { controller.abort(); }
      },
      controller.signal,
    );
    if (!disconnected) port.postMessage({ type: 'DONE', payload: result satisfies LLMResult });
  } catch (err) {
    if (!disconnected) port.postMessage({ type: 'ERROR', payload: { message: (err as Error).message } });
    throw err;
  }
}