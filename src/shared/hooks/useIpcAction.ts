/**
 * @file useIpcAction.ts
 * @description Generic React hook for sending IPC actions to the background.
 *
 * Wraps messageBus.send() with the runtime guards every popup action needs:
 *  - hasChromeRuntime() check (no-op in web app context)
 *  - error envelope unwrapping
 *  - structured ActionResult<TResponse> return
 *
 * Per CLAUDE.md, Chrome IPC lives in features hooks, never in views.
 * Views call useIpcAction. This hook calls messageBus.send. The bus does not
 * leak into view code.
 */

import { useCallback } from 'react';

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';

import { useMessageBus } from '@/shared/contexts/MessageBusContext';

/**
 * Result of an IPC action. Mirrors the bus's MessageResponse envelope so
 * callers destructure consistently.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Returns true if the chrome.runtime.sendMessage API is available.
 * Returns false in web app context or in tests.
 */
function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
}

interface UseIpcActionOptions {
  /**
   * Override the bus instance. Used by tests; production code relies on context.
   */
  messageBusOverride?: IMessageBus | null;
}

export function useIpcAction<TPayload = void, TResponse = unknown>(
  messageType: string,
  options: UseIpcActionOptions = {}
) {
  const busFromContext = useMessageBus();
  const messageBus = options.messageBusOverride !== undefined ? options.messageBusOverride : busFromContext;

  return useCallback(
    async (payload: TPayload): Promise<ActionResult<TResponse>> => {
      if (!hasChromeRuntime()) {
        return { success: false, error: 'Chrome extension runtime is unavailable in this context.' };
      }
      if (!messageBus) {
        return { success: false, error: 'MessageBus not initialized. Wrap app in MessageBusProvider.' };
      }
      try {
        const response = await messageBus.send<MessageResponse<TResponse>>('background', {
          type: messageType,
          payload: payload as object,
          timestamp: Date.now(),
        });
        if (response && response.success) {
          return { success: true, data: response.data };
        }
        return { success: false, error: response?.error ?? 'Unknown IPC error' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    [messageBus, messageType]
  );
}
