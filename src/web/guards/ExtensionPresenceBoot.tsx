import React from 'react';
import { Outlet } from 'react-router-dom';

import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { ExtensionPresenceProvider } from '@/web/extension-presence-context';

/**
 * Auth boot + extension presence for product routes. Does not block access.
 * Ping seams live on ExtensionPresenceProvider.
 */
export function ExtensionPresenceBoot(): React.ReactElement {
  const { status: authStatus } = useWebAuth();

  if (authStatus === 'loading') {
    return (
      <div
        className="auth-boot"
        data-od-id="auth-boot"
        style={{ minHeight: '100%', background: 'var(--paper)' }}
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  return (
    <ExtensionPresenceProvider>
      <Outlet />
    </ExtensionPresenceProvider>
  );
}
