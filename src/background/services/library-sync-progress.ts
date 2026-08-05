/**
 * @file library-sync-progress.ts
 * @description Broadcast SYNC_LIBRARY hydrate progress to the popup.
 */

import { browser } from 'wxt/browser';

import { LIBRARY_SYNC_PROGRESS } from '@/shared/schemas/message-schemas';

export function notifyLibrarySyncProgress(percent: number, phase?: string): void {
  const message = {
    type: LIBRARY_SYNC_PROGRESS,
    payload: { percent, phase },
    timestamp: Date.now(),
  };

  void browser.runtime.sendMessage(message).catch(() => {
    // Popup may be closed.
  });
}
