import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import type { User } from '@/background/auth/interfaces/i-auth-manager';
import { AUTH_SESSION_CLEARED } from '@/shared/auth/constants';
import { clearExtensionSession, syncSessionToExtension } from '@/shared/auth/session-bridge';
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

    void supabase.auth.getSession().then(({ data }) => {
      refreshFromSession(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      refreshFromSession(session);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await syncSessionToExtension(session);
      }

      if (event === 'SIGNED_OUT') {
        await clearExtensionSession();
      }
    });

    const handleExtensionMessage = (message: { type?: string }): void => {
      if (message?.type === AUTH_SESSION_CLEARED) {
        void supabase.auth.signOut();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleExtensionMessage);
    }

    return () => {
      subscription.subscription.unsubscribe();
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleExtensionMessage);
      }
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
    [user, status, error, login, logout, refreshFromSession, clearError],
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
