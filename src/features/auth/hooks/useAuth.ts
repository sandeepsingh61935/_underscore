import { useContext } from 'react';

import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';
import type { User } from '@/background/auth/interfaces/i-auth-manager';
import { WebAuthContext } from '@/features/auth/providers/WebAuthProvider';
import { useAuthOptional } from '@/ui-system/providers/AuthProvider';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface UseAuthResult {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (provider?: OAuthProviderType) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginUser: (user: User) => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

function hasExtensionRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime?.sendMessage === 'function' &&
    Boolean(chrome.runtime.id)
  );
}

/** Unified auth hook: extension popup uses AuthProvider; web SPA uses WebAuthProvider. */
export function useAuth(): UseAuthResult {
  const webAuth = useContext(WebAuthContext);
  const extensionAuth = useAuthOptional();

  if (hasExtensionRuntime()) {
    if (!extensionAuth) {
      throw new Error('useAuth requires AuthProvider in the extension popup');
    }
    return {
      user: extensionAuth.user,
      status: extensionAuth.status,
      isAuthenticated: extensionAuth.isAuthenticated,
      isLoading: extensionAuth.isLoading,
      error: extensionAuth.error,
      login: extensionAuth.login,
      loginWithEmail: extensionAuth.loginWithEmail,
      registerWithEmail: extensionAuth.registerWithEmail,
      loginUser: () => undefined,
      logout: extensionAuth.logout,
      clearError: extensionAuth.clearError,
    };
  }

  if (!webAuth) {
    throw new Error('useAuth requires WebAuthProvider on web');
  }

  const unsupported = async (): Promise<{ success: boolean; error?: string }> => ({
    success: false,
    error: 'Use SignInView for web authentication',
  });

  return {
    user: webAuth.user,
    status: webAuth.status,
    isAuthenticated: webAuth.isAuthenticated,
    isLoading: webAuth.isLoading,
    error: webAuth.error,
    login: unsupported,
    loginWithEmail: unsupported,
    registerWithEmail: unsupported,
    loginUser: webAuth.login,
    logout: webAuth.logout,
    clearError: webAuth.clearError,
  };
}
