import { useState, useEffect, useCallback } from 'react';

import type {
  User,
  OAuthProviderType,
} from '@/background/auth/interfaces/i-auth-manager';
import type { AuthStatePayload } from '@/shared/auth/auth-state-payload';
import { AUTH_CACHED_STATE_KEY } from '@/shared/auth/broadcast-auth-state';
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

interface CachedAuthState {
  user: User | null;
  verificationStatus: 'idle' | 'awaiting' | 'failed';
  verificationExpiresAt: number | null;
  verificationEmail: string | null;
}

const CACHED_AUTH_STATE_KEY = AUTH_CACHED_STATE_KEY;

function readCachedAuthState(): CachedAuthState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHED_AUTH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedAuthState>;
    return {
      user: parsed.user ?? null,
      verificationStatus: parsed.verificationStatus ?? 'idle',
      verificationExpiresAt: parsed.verificationExpiresAt ?? null,
      verificationEmail: parsed.verificationEmail ?? null,
    };
  } catch {
    return null;
  }
}

function writeCachedAuthState(state: Partial<CachedAuthState>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const current = readCachedAuthState() ?? {
      user: null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
    };
    const updated: CachedAuthState = {
      user: 'user' in state ? (state.user ?? null) : current.user,
      verificationStatus:
        'verificationStatus' in state && state.verificationStatus
          ? state.verificationStatus
          : current.verificationStatus,
      verificationExpiresAt:
        'verificationExpiresAt' in state
          ? (state.verificationExpiresAt ?? null)
          : current.verificationExpiresAt,
      verificationEmail:
        'verificationEmail' in state
          ? (state.verificationEmail ?? null)
          : current.verificationEmail,
    };
    window.localStorage.setItem(CACHED_AUTH_STATE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearCachedAuthState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CACHED_AUTH_STATE_KEY);
    }
  } catch {
    // ignore
  }
}

/** SW-free read: chrome.storage works without waking the service worker. */
async function readExtensionCachedAuthState(): Promise<Partial<AuthResponse> | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return null;
    const sessionGet = chrome.storage.session?.get
      ? await chrome.storage.session.get(CACHED_AUTH_STATE_KEY)
      : null;
    const sessionHit = (sessionGet as Record<string, unknown> | null)?.[
      CACHED_AUTH_STATE_KEY
    ];
    if (sessionHit && typeof sessionHit === 'object') {
      return sessionHit as Partial<AuthResponse>;
    }
    const localGet = chrome.storage.local?.get
      ? await chrome.storage.local.get(CACHED_AUTH_STATE_KEY)
      : null;
    const localHit = (localGet as Record<string, unknown> | null)?.[
      CACHED_AUTH_STATE_KEY
    ];
    if (localHit && typeof localHit === 'object') {
      return localHit as Partial<AuthResponse>;
    }
    return null;
  } catch {
    return null;
  }
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
  const [initialCached] = useState<CachedAuthState | null>(() => readCachedAuthState());
  const [user, setUser] = useState<User | null>(() => initialCached?.user ?? null);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'awaiting' | 'failed'
  >(() => initialCached?.verificationStatus ?? 'idle');
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(
    () => initialCached?.verificationExpiresAt ?? null
  );
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    () => initialCached?.verificationEmail ?? null
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialCached !== null) return false;
    if (!hasChromeRuntime()) return false;
    return true;
  });
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
    writeCachedAuthState({
      user: null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
    });
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
    writeCachedAuthState(data);
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

    const reconcileAuthState = async (): Promise<void> => {
      // SW-free cache first (no service-worker wake), then live IPC.
      const cached = await readExtensionCachedAuthState();
      if (!mounted) return;
      if (cached) {
        applyAuthPayload(cached);
        setIsLoading(false);
      }

      const result = await getAuthStateAction({});
      if (!mounted) return;

      if (result.success) {
        applyAuthPayload(result.data);
      } else if (!cached) {
        setUser(null);
        setVerificationStatus('idle');
        setVerificationExpiresAt(null);
        setVerificationEmail(null);
      }
      setIsLoading(false);
    };

    void reconcileAuthState();

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
