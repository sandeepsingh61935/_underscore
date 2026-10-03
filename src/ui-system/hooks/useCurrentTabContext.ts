import { useState, useEffect } from 'react';

import { getSectionPath, normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface TabContext {
  url: string | null;
  domain: string | null;
  path: string | null;
  title: string | null;
  /**
   * True when the active tab lives in an incognito/private window
   * (chrome.tabs.Tab.incognito). Null when the tabs API is unavailable,
   * in which case callers treat the value as unknown (non-incognito gate
   * behavior per isSyncableTabUrl's optional flag).
   */
  incognito: boolean | null;
}

export function useCurrentTabContext() {
  const [tabContext, setTabContext] = useState<TabContext>({
    url: null,
    domain: null,
    path: null,
    title: null,
    incognito: null,
  });

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
          try {
            const parsedUrl = new URL(tab.url);
            const normalized = normalizePageUrl(tab.url);
            setTabContext({
              url: normalized,
              domain: parsedUrl.hostname.replace(/^www\./, ''),
              path: getSectionPath(tab.url),
              title: tab.title || null,
              incognito: tab.incognito === true,
            });
          } catch {
            // Ignore invalid URLs
          }
        }
      });
    }
  }, []);

  return tabContext;
}
