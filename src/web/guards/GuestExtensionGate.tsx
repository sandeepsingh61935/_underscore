import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import {
  pingExtensionPresence,
  shouldBlockGuestProductAccess,
  type ExtensionPresence,
} from '@/shared/extension/extension-presence';

export interface GuestExtensionGateProps {
  /** Test seam: skip network ping. */
  presenceOverride?: ExtensionPresence;
  /** Test seam: custom ping. */
  ping?: typeof pingExtensionPresence;
}

/**
 * Guest hard gate (PRD 2026-08-23): product shell requires extension ping.
 * Signed-in users pass through (library viewer). Fail closed while checking.
 */
export function GuestExtensionGate({
  presenceOverride,
  ping = pingExtensionPresence,
}: GuestExtensionGateProps = {}): React.ReactElement {
  const { isAuthenticated } = useApp();
  const location = useLocation();
  const [presence, setPresence] = useState<ExtensionPresence | null>(
    presenceOverride ?? (isAuthenticated ? 'installed' : null),
  );

  useEffect(() => {
    if (presenceOverride !== undefined) {
      setPresence(presenceOverride);
      return;
    }
    if (isAuthenticated) {
      setPresence('installed');
      return;
    }
    let cancelled = false;
    setPresence(null);
    void ping().then((r) => {
      if (!cancelled) {
        setPresence(r.presence);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, presenceOverride, ping]);

  if (isAuthenticated) {
    return <Outlet />;
  }

  // Fail closed while resolving
  if (presence === null) {
    return (
      <div
        className="install"
        data-od-id="extension-gate-pending"
        style={{ minHeight: '100%', background: 'var(--paper)' }}
        aria-busy="true"
      />
    );
  }

  if (shouldBlockGuestProductAccess({ isAuthenticated: false, presence })) {
    return (
      <Navigate
        to="/install"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
