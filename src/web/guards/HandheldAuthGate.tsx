import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { handheldAuthRedirect } from '@/web/guards/handheld-auth-redirect';
import { useWebClientKind } from '@/web/lib/use-web-client-kind';

/**
 * Phone and tablet unsigned sessions cannot use the product shell.
 * Desktop guest is unchanged (extension gate still applies downstream).
 */
export function HandheldAuthGate(): React.ReactElement | null {
  const { isAuthenticated } = useApp();
  const { status: authStatus } = useWebAuth();
  const location = useLocation();
  const kind = useWebClientKind();

  if (authStatus === 'loading') return null;

  const returnTo = `${location.pathname}${location.search}`;
  const to = handheldAuthRedirect(isAuthenticated, kind, returnTo);
  if (to) return <Navigate to={to} replace />;
  return <Outlet />;
}
