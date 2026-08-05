import { useState, useEffect } from 'react';

import { getSectionPath, normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface TabContext {
  url: string | null;
  domain: string | null;
  path: string | null;
  title: string | null;
}

export function useCurrentTabContext() {
  const [tabContext, setTabContext] = useState<TabContext>({
    url: null,
    domain: null,
    path: null,
    title: null,
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
