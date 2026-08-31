import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { User } from '@/background/auth/interfaces/i-auth-manager';
import {
  clearExtensionSession,
  syncSessionToExtension,
} from '@/shared/auth/session-bridge';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export type WebAuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface WebAuthContextValue {
  user: User | null;
  status: WebAuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshFromSession: (session: Session | null) => void;
  clearError: () => void;
}

const WebAuthContext = createContext<WebAuthContextValue | null>(null);

export { WebAuthContext };

function mapSupabaseUser(sessionUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    displayName:
      (sessionUser.user_metadata?.['full_name'] as string | undefined) ||
      sessionUser.email?.split('@')[0] ||
      'User',
    photoUrl: sessionUser.user_metadata?.['avatar_url'] as string | undefined,
    provider: (sessionUser.app_metadata?.['provider'] as string | undefined) ?? 'email',
  };
}

interface WebAuthProviderProps {
  children: React.ReactNode;
}

export function WebAuthProvider({ children }: WebAuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<WebAuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refreshFromSession = useCallback((session: Session | null) => {
    if (session?.user) {
      setUser(mapSupabaseUser(session.user));
      setStatus('authenticated');
    } else {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    const supabase = getWebSupabaseClient();

    // First definitive restore: getSession (storage) + INITIAL_SESSION from subscription.
    // Logout coupling (PRD 2026-08-30): web is source of truth for browser login.
    // Extension AUTH_SESSION_CLEARED must NOT force web signOut (accidental wipe).
    // Web logout still clears extension via clearExtensionSession / logout().
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[web-auth] getSession failed', {
            message: error.message,
            name: error.name,
          });
          refreshFromSession(null);
          return;
        }
        refreshFromSession(data.session);
      })
      .catch((err: unknown) => {
        console.warn('[web-auth] getSession threw', err);
        refreshFromSession(null);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        refreshFromSession(session);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await syncSessionToExtension(session);
        }

        if (event === 'SIGNED_OUT') {
          await clearExtensionSession();
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [refreshFromSession]);

  const login = useCallback((nextUser: User) => {
    setUser(nextUser);
    setStatus('authenticated');
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    const supabase = getWebSupabaseClient();
    await supabase.auth.signOut();
    await clearExtensionSession();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<WebAuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      error,
      login,
      logout,
      refreshFromSession,
      clearError,
    }),
    [user, status, error, login, logout, refreshFromSession, clearError]
  );

  return <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>;
}

export function useWebAuth(): WebAuthContextValue {
  const context = useContext(WebAuthContext);
  if (!context) {
    throw new Error('useWebAuth must be used within WebAuthProvider');
  }
  return context;
}
