import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import {
  pingExtensionPresence,
  shouldBlockGuestProductAccess,
  type ExtensionPresence,
} from '@/shared/extension/extension-presence';
import { ExtensionPresenceProvider } from '@/web/extension-presence-context';

export interface GuestExtensionGateProps {
  /** Test seam: skip network ping. */
  presenceOverride?: ExtensionPresence;
  /** Test seam: custom ping. */
  ping?: typeof pingExtensionPresence;
}

/**
 * Guest hard gate (PRD 2026-08-23): product shell requires extension ping.
 * Signed-in users pass through (library viewer). Fail closed while checking.
 * Provides ExtensionPresence to empty states (no "Install extension" when present).
 */
export function GuestExtensionGate({
  presenceOverride,
  ping = pingExtensionPresence,
}: GuestExtensionGateProps = {}): React.ReactElement {
  const { isAuthenticated } = useApp();
  const location = useLocation();
  const [presence, setPresence] = useState<ExtensionPresence | null>(
    presenceOverride ?? null,
  );

  useEffect(() => {
    if (presenceOverride !== undefined) {
      setPresence(presenceOverride);
      return;
    }
    let cancelled = false;
    setPresence(null);
    void ping().then((r) => {
      if (!cancelled) {
        // Signed-in may use the app without extension; record real presence for UI.
        setPresence(r.presence === 'installed' ? 'installed' : isAuthenticated ? 'missing' : r.presence);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, presenceOverride, ping]);

  // Fail closed for guests while resolving
  if (presence === null) {
    if (isAuthenticated) {
      // Allow shell; empty states treat null as unknown (no install CTA spam until known)
      return (
        <ExtensionPresenceProvider value="unknown">
          <Outlet />
        </ExtensionPresenceProvider>
      );
    }
    return (
      <div
        className="install"
        data-od-id="extension-gate-pending"
        style={{ minHeight: '100%', background: 'var(--paper)' }}
        aria-busy="true"
      />
    );
  }

  if (shouldBlockGuestProductAccess({ isAuthenticated, presence })) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname, gateOpen: true, toast: 'Install the extension to use the app' }}
      />
    );
  }

  return (
    <ExtensionPresenceProvider value={presence}>
      <Outlet />
    </ExtensionPresenceProvider>
  );
}
