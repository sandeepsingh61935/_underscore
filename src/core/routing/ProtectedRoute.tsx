import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { AUTH_REQUIRED_MODES } from '@/shared/constants/mode-storage';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

/**
 * Redirects unauthenticated users away from auth-required modes.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const { isAuthenticated, currentMode } = useApp();
  const location = useLocation();

  const requiresAuth = AUTH_REQUIRED_MODES.includes(currentMode);

  if (requiresAuth && !isAuthenticated) {
    const params = new URLSearchParams({
      intendedMode: currentMode,
      returnTo: location.pathname,
    });
    return <Navigate to={`/sign-in?${params.toString()}`} replace />;
  }

  return children;
}
