import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  PAGE_RESTORATION_STATUS,
  GET_RESTORATION_STATUS,
  REANCHOR_HIGHLIGHT,
  CHECK_PAGE_SELECTION,
  type PageRestorationStatusPayload,
} from '@/shared/schemas/message-schemas';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface PageRestorationStatusResult {
  unanchoredIds: Set<string>;
  unanchoredCount: number;
  isUnanchored: (id: string) => boolean;
  hasPageSelection: boolean;
  isLoading: boolean;
  checkSelection: () => Promise<boolean>;
  reanchorHighlight: (id: string) => Promise<boolean>;
}

export function usePageRestorationStatus(
  currentUrl?: string | null
): PageRestorationStatusResult {
  const [unanchoredIds, setUnanchoredIds] = useState<Set<string>>(new Set());
  const [hasPageSelection, setHasPageSelection] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  const getActiveTabId = useCallback(async (): Promise<number | null> => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0]?.id ?? null);
      });
    });
  }, []);

  const queryStatus = useCallback(async () => {
    try {
      const tabId = await getActiveTabId();
      if (tabId == null) {
        setIsLoading(false);
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: GET_RESTORATION_STATUS, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime?.lastError) {
            // Content script may not be loaded on this page (e.g. chrome://)
            setIsLoading(false);
            return;
          }
          if (response?.success && response.data) {
            startTransition(() => {
              setUnanchoredIds(new Set(response.data.unanchoredIds || []));
              setHasPageSelection(Boolean(response.data.hasSelection));
              setIsLoading(false);
            });
          } else {
            setIsLoading(false);
          }
        }
      );
    } catch {
      setIsLoading(false);
    }
  }, [getActiveTabId]);

  const checkSelection = useCallback(async (): Promise<boolean> => {
    try {
      const tabId = await getActiveTabId();
      if (tabId == null) return false;

      return new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tabId,
          { type: CHECK_PAGE_SELECTION, timestamp: Date.now() },
          (response) => {
            if (chrome.runtime?.lastError || !response?.success) {
              resolve(false);
              return;
            }
            const hasSel = Boolean(response?.data?.hasSelection);
            setHasPageSelection(hasSel);
            resolve(hasSel);
          }
        );
      });
    } catch {
      return false;
    }
  }, [getActiveTabId]);

  const reanchorHighlight = useCallback(
    async (highlightId: string): Promise<boolean> => {
      try {
        const tabId = await getActiveTabId();
        if (tabId == null) return false;

        return new Promise((resolve) => {
          chrome.tabs.sendMessage(
            tabId,
            {
              type: REANCHOR_HIGHLIGHT,
              payload: { highlightId },
              timestamp: Date.now(),
            },
            (response) => {
              if (chrome.runtime?.lastError || !response?.success) {
                resolve(false);
                return;
              }
              startTransition(() => {
                setUnanchoredIds((prev) => {
                  const next = new Set(prev);
                  next.delete(highlightId);
                  return next;
                });
              });
              resolve(true);
            }
          );
        });
      } catch {
        return false;
      }
    },
    [getActiveTabId]
  );

  useEffect(() => {
    void queryStatus();
  }, [queryStatus, currentUrl]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const messageHandler = (message: any) => {
      if (message?.type === PAGE_RESTORATION_STATUS && message.payload) {
        const payload = message.payload as PageRestorationStatusPayload;
        if (!currentUrl || normalizePageUrl(payload.url) === normalizePageUrl(currentUrl)) {
          startTransition(() => {
            setUnanchoredIds(new Set(payload.unanchoredIds || []));
          });
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageHandler);
      }
    };
  }, [currentUrl]);

  const isUnanchored = useCallback(
    (id: string): boolean => {
      return unanchoredIds.has(id);
    },
    [unanchoredIds]
  );

  return {
    unanchoredIds,
    unanchoredCount: unanchoredIds.size,
    isUnanchored,
    hasPageSelection,
    isLoading,
    checkSelection,
    reanchorHighlight,
  };
}
