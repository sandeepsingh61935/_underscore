/**
 * @file library-change-notifier.ts
 * @description Notify popup and other extension pages that library data changed.
 */

import { browser } from 'wxt/browser';

import type { CloudHydrationResult } from '@/background/services/interfaces/i-cloud-hydration-service';
import { LIBRARY_DATA_CHANGED } from '@/shared/schemas/message-schemas';

export type LibraryChangePayload = CloudHydrationResult | {
  source: string;
  deletedCount?: number;
  removedIds?: string[];
  restoredIds?: string[];
};

/**
 * Broadcast library changes to popup + content tabs.
 * Deferred one microtask so IPC handlers can call sendResponse before
 * listeners trigger nested runtime messages (avoids "message port closed").
 */
export function notifyLibraryDataChanged(payload: LibraryChangePayload): void {
  queueMicrotask(() => {
    broadcastLibraryDataChanged(payload);
  });
}

function broadcastLibraryDataChanged(payload: LibraryChangePayload): void {
  // Must match MessageSchema (type + payload + timestamp) so ChromeMessageBus
  // does not reject the broadcast as "Invalid message received".
  const message = {
    type: LIBRARY_DATA_CHANGED,
    payload,
    timestamp: Date.now(),
  };

  const runtime = (browser as unknown as { runtime?: { sendMessage?: (msg: unknown) => Promise<unknown> } })?.runtime;
  if (runtime?.sendMessage) {
    void runtime.sendMessage(message).catch(() => {
      // Popup may be closed.
    });
  }

  // Guard for test environments where tabs API is not mocked.
  try {
    const maybePromise = (browser as unknown as { tabs?: { query?: (q: unknown) => unknown } })?.tabs?.query?.({});
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      void (maybePromise as Promise<{ id?: number }[]>).then((tabs) => {
        for (const tab of tabs ?? []) {
          if (!tab.id) continue;
          void browser.tabs.sendMessage(tab.id, message).catch(() => {
            // Tab may not have a content script.
          });
        }
      }).catch(() => {
        // Query failed.
      });
    }
  } catch {
    // tabs API not available (tests).
  }
}
