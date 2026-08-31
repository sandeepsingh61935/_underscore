import { useState, useEffect, useCallback } from 'react';

import type {
  User,
  OAuthProviderType,
} from '@/background/auth/interfaces/i-auth-manager';
import type { AuthStatePayload } from '@/shared/auth/auth-state-payload';
import { AUTH_SESSION_CLEARED, AUTH_STATE_CHANGED } from '@/shared/auth/constants';
import { useIpcAction, type ActionResult } from '@/shared/hooks/useIpcAction';

export type { User };

interface AuthResponse extends AuthStatePayload {}

interface AuthStateChangedMessage {
  type?: string;
  payload?: AuthStatePayload;
}

interface UseCurrentUserResult {
  user: User | null;
  verificationStatus: 'idle' | 'awaiting' | 'failed';
  verificationExpiresAt: number | null;
  /** Email awaiting confirmation; persists across popup close/reopen. */
  verificationEmail: string | null;
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
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: string;
    verificationStatus?: 'idle' | 'awaiting' | 'failed';
  }>;
  logout: () => Promise<void>;
}

function hasChromeRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function'
  );
}

/**
 * Hook to access current user auth state from background AuthManager.
 *
 * Per ADR-004, all IPC goes through IMessageBus. The four IPC actions
 * (LOGIN, LOGIN_EMAIL, REGISTER_EMAIL, LOGOUT) use useIpcAction. The
 * GET_AUTH_STATE fetch and AUTH_STATE_CHANGED subscription remain inline
 * because they are subscription/fetch patterns, not request/response.
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'awaiting' | 'failed'
  >('idle');
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loginAction = useIpcAction<{ provider?: OAuthProviderType }, AuthResponse>(
    'LOGIN'
  );
  const loginEmailAction = useIpcAction<
    { email: string; password: string },
    AuthResponse
  >('LOGIN_EMAIL');
  const registerEmailAction = useIpcAction<
    { email: string; password: string },
    AuthResponse
  >('REGISTER_EMAIL');
  const logoutAction = useIpcAction<void, AuthResponse>('LOGOUT');
  const getAuthStateAction = useIpcAction<Record<string, never>, AuthResponse>(
    'GET_AUTH_STATE'
  );

  const clearAuthState = (): void => {
    setUser(null);
    setVerificationStatus('idle');
    setVerificationExpiresAt(null);
    setVerificationEmail(null);
  };

  const applyAuthPayload = (data: Partial<AuthResponse>): void => {
    if ('user' in data) {
      setUser(data.user ?? null);
    }
    if ('verificationStatus' in data && data.verificationStatus) {
      setVerificationStatus(data.verificationStatus);
    }
    if ('verificationExpiresAt' in data) {
      setVerificationExpiresAt(data.verificationExpiresAt ?? null);
    }
    if ('verificationEmail' in data) {
      setVerificationEmail(data.verificationEmail ?? null);
    }
  };

  // Fetch initial auth state from background
  useEffect(() => {
    let mounted = true;

    if (!hasChromeRuntime()) {
      setUser(null);
      setVerificationStatus('idle');
      setVerificationExpiresAt(null);
      setVerificationEmail(null);
      setIsLoading(false);

      return () => {
        mounted = false;
      };
    }

    const fetchAuthState = async (): Promise<void> => {
      const result = await getAuthStateAction({});
      if (!mounted) return;

      if (result.success) {
        applyAuthPayload(result.data);
      } else {
        setUser(null);
        setVerificationStatus('idle');
        setVerificationExpiresAt(null);
        setVerificationEmail(null);
      }
      setIsLoading(false);
    };

    void fetchAuthState();

    const handleMessage = (message: AuthStateChangedMessage): void => {
      if (message?.type === AUTH_STATE_CHANGED && message.payload) {
        applyAuthPayload(message.payload);
        return;
      }
      if (message?.type === AUTH_SESSION_CLEARED) {
        clearAuthState();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      mounted = false;
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (provider: OAuthProviderType = 'google') => {
      setIsLoading(true);
      setError(null);
      const result: ActionResult<AuthResponse> = await loginAction({ provider });
      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return { success: false, error: result.error };
      }
      applyAuthPayload(result.data);
      setIsLoading(false);
      return { success: true };
    },
    [loginAction]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      const result = await loginEmailAction({ email, password });
      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return { success: false, error: result.error };
      }
      if (result.success) {
        applyAuthPayload(result.data);
      }
      setIsLoading(false);
      return { success: true };
    },
    [loginEmailAction]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      const result = await registerEmailAction({ email, password });
      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return { success: false, error: result.error, code: result.code };
      }
      applyAuthPayload(result.data);
      setIsLoading(false);
      // Surface verificationStatus directly (not just via re-render) so callers
      // can branch on it synchronously instead of racing a stale closure value.
      return { success: true, verificationStatus: result.data.verificationStatus };
    },
    [registerEmailAction]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await logoutAction(undefined);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    applyAuthPayload(result.data);
    setIsLoading(false);
  }, [logoutAction]);

  return {
    user,
    verificationStatus,
    verificationExpiresAt,
    verificationEmail,
    isLoading,
    error,
    login,
    loginWithEmail,
    registerWithEmail,
    logout,
  };
}
