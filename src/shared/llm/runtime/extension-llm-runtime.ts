/**
 * Extension adapter: chrome.runtime Port → background AiOrchestrator (ADR-027).
 */

import type { LLMResult } from '@/shared/interfaces/i-llm-service';
import { sendLlmChat } from '@/shared/llm/llm-ipc-chat';
import type { ILlmRuntime, LlmStreamArgs } from './i-llm-runtime';
import type { LlmStreamEvent } from './stream-protocol';
import { isLlmStreamEvent } from './stream-protocol';

interface StreamingPort {
  postMessage: (msg: unknown) => void;
  onMessage: { addListener: (cb: (msg: unknown) => void) => void };
  onDisconnect: { addListener: (cb: () => void) => void };
  disconnect: () => void;
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.connect === 'function';
}

export function createExtensionLlmRuntime(): ILlmRuntime {
  return {
    streamChat(args, onEvent, signal) {
      return new Promise<void>((resolve) => {
        if (!hasChromeRuntime()) {
          onEvent({
            type: 'ERROR',
            payload: { message: 'Chrome extension runtime is unavailable in this context.' },
          });
          resolve();
          return;
        }

        const port = chrome.runtime.connect({ name: 'llm-stream' }) as unknown as StreamingPort;
        let settled = false;

        const settle = (): void => {
          if (settled) return;
          settled = true;
          signal.removeEventListener('abort', onAbort);
          resolve();
        };

        const onAbort = (): void => {
          try {
            port.disconnect();
          } catch {
            /* closed */
          }
          settle();
        };

        signal.addEventListener('abort', onAbort);

        port.onMessage.addListener((msg: unknown) => {
          if (!isLlmStreamEvent(msg)) return;
          const event = msg as LlmStreamEvent;
          onEvent(event);
          if (event.type === 'DONE' || event.type === 'ERROR') {
            settle();
          }
        });

        port.onDisconnect.addListener(() => {
          if (!settled) {
            onEvent({
              type: 'ERROR',
              payload: { message: 'Stream disconnected before completion' },
            });
          }
          settle();
        });

        port.postMessage({
          type: 'STREAM_CHAT_REQUEST',
          payload: {
            request: args.request,
            provider: args.provider,
          },
        });
      });
    },

    async chat(args: LlmStreamArgs): Promise<LLMResult> {
      const result = await sendLlmChat({
        request: args.request,
        ...(args.provider ? { provider: args.provider } : {}),
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  };
}
