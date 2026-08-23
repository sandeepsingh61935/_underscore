import React, { createContext, useContext } from 'react';

import type { ExtensionPresence } from '@/shared/extension/extension-presence';

const ExtensionPresenceContext = createContext<ExtensionPresence | null>(null);

export function ExtensionPresenceProvider({
  value,
  children,
}: {
  value: ExtensionPresence;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ExtensionPresenceContext.Provider value={value}>
      {children}
    </ExtensionPresenceContext.Provider>
  );
}

/** null = outside product shell / unknown. */
export function useExtensionPresence(): ExtensionPresence | null {
  return useContext(ExtensionPresenceContext);
}
