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

  void browser.runtime.sendMessage(message).catch(() => {
    // Popup may be closed.
  });

  void browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      void browser.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab may not have a content script.
      });
    }
  });
}
