import React, { createContext, useContext, useEffect, useState } from 'react';

import {
  pingExtensionPresence,
  type ExtensionPresence,
} from '@/shared/extension/extension-presence';

const ExtensionPresenceContext = createContext<ExtensionPresence | null>(null);

export type ExtensionPingFn = typeof pingExtensionPresence;

export function ExtensionPresenceProvider({
  children,
  presenceOverride,
  ping = pingExtensionPresence,
}: {
  children: React.ReactNode;
  presenceOverride?: ExtensionPresence;
  ping?: ExtensionPingFn;
}): React.ReactElement {
  const [presence, setPresence] = useState<ExtensionPresence>(
    presenceOverride ?? 'unknown'
  );

  useEffect(() => {
    if (presenceOverride !== undefined) {
      setPresence(presenceOverride);
      return;
    }
    let cancelled = false;
    const run = (): void => {
      void ping().then((r) => {
        if (cancelled) return;
        setPresence(r.presence === 'installed' ? 'installed' : 'missing');
      });
    };
    run();
    const onVis = (): void => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [presenceOverride, ping]);

  return (
    <ExtensionPresenceContext.Provider value={presence}>
      {children}
    </ExtensionPresenceContext.Provider>
  );
}

/** null = outside product shell / unknown. */
export function useExtensionPresence(): ExtensionPresence | null {
  return useContext(ExtensionPresenceContext);
}
