import React, { useCallback, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import {
  ExtensionSetupRemnant,
  ExtensionSetupStrip,
} from '@/web/components/ExtensionSetupChrome';
import { useExtensionPresence } from '@/web/extension-presence-context';
import {
  readExtensionNoticePrefs,
  writeExtensionNoticePrefs,
} from '@/web/lib/extension-notice-prefs';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';
import { resolveExtensionNotice } from '@/web/lib/resolve-extension-notice';

export function useExtensionNoticeChrome(): {
  strip: ReactNode;
  remnant: ReactNode;
} {
  const presence = useExtensionPresence();
  const { isAuthenticated } = useApp();
  const isMobileViewport = useMobileWebViewport();
  const location = useLocation();
  const [prefs, setPrefs] = useState(readExtensionNoticePrefs);
  const from = `${location.pathname}${location.search}`;

  const view = resolveExtensionNotice({
    presence,
    isAuthenticated,
    isMobileViewport,
    prefs,
  });

  const onDismiss = useCallback(() => {
    if (view.surface === 'none') return;
    setPrefs(writeExtensionNoticePrefs({ [view.dismissKey]: true }));
  }, [view]);

  if (view.surface === 'strip') {
    return {
      strip: <ExtensionSetupStrip view={view} from={from} onDismiss={onDismiss} />,
      remnant: null,
    };
  }

  if (view.surface === 'remnant') {
    return {
      strip: null,
      remnant: <ExtensionSetupRemnant view={view} from={from} />,
    };
  }

  return { strip: null, remnant: null };
}
