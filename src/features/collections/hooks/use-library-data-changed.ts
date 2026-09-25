/**
 * @file use-library-data-changed.ts
 * @description Subscribe to background LIBRARY_DATA_CHANGED broadcasts.
 */

import { useEffect } from 'react';

import { LIBRARY_DATA_CHANGED } from '@/shared/schemas/message-schemas';

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.onMessage === 'object';
}

/** Re-run `onChanged` when cloud hydration completes in the background. */
export function useLibraryDataChanged(onChanged: () => void): void {
  useEffect(() => {
    if (!hasChromeRuntime()) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handleMessage = (message: { type?: string }): void => {
      if (message?.type === LIBRARY_DATA_CHANGED) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          timeout = null;
          onChanged();
        }, 150);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      if (timeout) clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [onChanged]);
}
