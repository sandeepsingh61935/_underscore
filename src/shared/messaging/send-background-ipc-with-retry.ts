/**
 * Content → background IPC with short retries for cold service-worker wake.
 * Shared by write (LocalCacheIpc) and read (IpcReadable) adapters.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { Message } from '@/shared/schemas/message-schemas';

export const BACKGROUND_IPC_MAX_ATTEMPTS = 6;
/** Delay before attempts (ms). Attempt 0 is immediate. Extended for MV3 SW cold wake (~500-800ms). */
export const BACKGROUND_IPC_RETRY_DELAYS_MS = [0, 100, 300, 600, 1000, 1500] as const;

export type BackgroundIpcExhaustedPolicy = 'log' | 'throw';

export interface SendBackgroundIpcWithRetryOptions {
  /** Called when all attempts fail and policy is `log`. */
  onLogExhausted?: (error: unknown, attempts: number) => void;
  onExhausted?: BackgroundIpcExhaustedPolicy;
  maxAttempts?: number;
  retryDelaysMs?: readonly number[];
}

/**
 * Send a message to the background worker with retries.
 * - `onExhausted: 'throw'` (default for reads): rethrow last error.
 * - `onExhausted: 'log'`: call onLogExhausted and resolve (writes that already
 *   succeeded in a local cache).
 */
export async function sendBackgroundIpcWithRetry<T = unknown>(
  messageBus: IMessageBus,
  message: Message,
  options: SendBackgroundIpcWithRetryOptions = {}
): Promise<T | undefined> {
  const maxAttempts = options.maxAttempts ?? BACKGROUND_IPC_MAX_ATTEMPTS;
  const delays = options.retryDelaysMs ?? BACKGROUND_IPC_RETRY_DELAYS_MS;
  const onExhausted = options.onExhausted ?? 'throw';
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = delays[attempt] ?? 100;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      const response = await messageBus.send<T | { success?: boolean } | undefined>(
        'background',
        message
      );

      if (
        response &&
        typeof response === 'object' &&
        'success' in response &&
        (response as { success?: boolean }).success === false
      ) {
        throw new Error(`IPC ${message.type} returned success: false`);
      }

      return response as T;
    } catch (err) {
      lastError = err;
    }
  }

  if (onExhausted === 'log') {
    options.onLogExhausted?.(lastError, maxAttempts);
    return undefined;
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
