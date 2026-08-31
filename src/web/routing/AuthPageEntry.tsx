import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { resolveSafeReturnTo } from './safe-return-to';

import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';

/**
 * Wraps /sign-in (and similar): boot skeleton while loading;
 * send already-authenticated users to Home / safe returnTo.
 */
export function AuthPageEntry({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { status } = useWebAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        className="auth-boot"
        data-od-id="auth-boot"
        style={{
          minHeight: '100%',
          width: '100%',
          background: 'var(--paper)',
        }}
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  if (status === 'authenticated') {
    const params = new URLSearchParams(location.search);
    const target = resolveSafeReturnTo(params.get('returnTo'), '/home');
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
