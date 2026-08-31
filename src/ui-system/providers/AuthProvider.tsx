import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';

import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';
import { useCurrentUser, type User } from '@/features/auth/hooks/useCurrentUser';

// Re-export User so existing consumers of `import { User } from '.../AuthProvider'`
// keep compiling. The canonical definition now lives in useCurrentUser.
export type { User };

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  /** Current user or null */
  user: User | null;
  /** Current auth status */
  status: AuthStatus;
  /** Convenience check for authenticated */
  isAuthenticated: boolean;
  /** Is currently loading auth state */
  isLoading: boolean;
  /** Auth error message if any */
  error: string | null;
  /** Email confirmation status from AuthManager (used to resume popup routing). */
  verificationStatus: 'idle' | 'awaiting' | 'failed';
  /** Login with OAuth provider */
  login: (provider?: OAuthProviderType) => Promise<{ success: boolean; error?: string }>;
  /** Login with email + password (new — surfaced via useCurrentUser) */
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  /** Register with email + password (new — surfaced via useCurrentUser) */
  registerWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  /** Logout current user */
  logout: () => Promise<void>;
  /** Clear error state (no-op: error state is owned by useCurrentUser) */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Returns auth context when wrapped in AuthProvider; null otherwise (tests). */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

/**
 * Hook to access auth context.
 *
 * Throws if used outside an AuthProvider so deep-tree consumers get a clear
 * wiring error rather than a silent `null` context.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
  /** Initial user if known (SSR/test scenarios) */
  initialUser?: User | null;
}

/**
 * Authentication provider.
 *
 * Thin context wrapper around `useCurrentUser` (ADR-017). All chrome.runtime
 * auth IPC lives in useCurrentUser; this provider only:
 *   1. Derives an `AuthStatus` (`loading` | `authenticated` | `unauthenticated`)
 *      from useCurrentUser's `isLoading` + `user` for context consumers.
 *   2. Exposes useCurrentUser's actions under a stable AuthContext surface
 *      so deep-tree consumers read via context, not by re-calling the hook.
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const {
    user: liveUser,
    isLoading,
    error,
    verificationStatus,
    login,
    loginWithEmail,
    registerWithEmail,
    logout,
  } = useCurrentUser();

  // Honor an SSR/test-time initialUser until live state supersedes it.
  // useCurrentUser's first paint has isLoading=true and user=null, so we
  // surface initialUser as a non-loading seed. Once isLoading flips to
  // false, the live state wins.
  const user = isLoading && initialUser ? initialUser : liveUser;
  const status: AuthStatus = isLoading
    ? 'loading'
    : user
      ? 'authenticated'
      : 'unauthenticated';
  const isAuthenticated = status === 'authenticated';

  // AuthProvider no longer owns error state (useCurrentUser does), so this
  // exists only for source-compat. It is a no-op because useCurrentUser
  // clears `error` itself on the next action.
  const clearError = useCallback(() => {
    // intentional no-op: error lifecycle is managed by useCurrentUser.
  }, []);

  // Note: any local useEffect to bridge `useCurrentUser` -> context is
  // unnecessary; the provider recomputes `value` on every render, and the
  // underlying hook handles subscription + fetching.

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated,
      isLoading,
      error,
      verificationStatus,
      login,
      loginWithEmail,
      registerWithEmail,
      logout,
      clearError,
    }),
    [
      user,
      status,
      isAuthenticated,
      isLoading,
      error,
      verificationStatus,
      login,
      loginWithEmail,
      registerWithEmail,
      logout,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook for auth-dependent rendering. Reads `isAuthenticated` and `isLoading`
 * from AuthContext; useful for gated routes or redirect logic.
 */
export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectTo) {
      // Could integrate with router here
      console.log('[useRequireAuth] Not authenticated, should redirect to:', redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}
