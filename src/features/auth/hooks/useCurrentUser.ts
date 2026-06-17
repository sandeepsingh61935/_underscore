import { useState, useEffect, useCallback } from 'react';

import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';

import { useIpcAction, type ActionResult } from '@/shared/hooks/useIpcAction';

export interface User {
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    photoUrl?: string;
    provider?: OAuthProviderType;
}

interface AuthResponse {
    user?: User;
    verificationStatus?: 'idle' | 'awaiting' | 'failed';
    verificationExpiresAt?: number | null;
}

interface AuthStateChangedMessage {
    type?: string;
    payload?: AuthResponse;
    user?: User;
    verificationStatus?: 'idle' | 'awaiting' | 'failed';
    verificationExpiresAt?: number | null;
}

interface UseCurrentUserResult {
    user: User | null;
    verificationStatus: 'idle' | 'awaiting' | 'failed';
    verificationExpiresAt: number | null;
    isLoading: boolean;
    error: string | null;
    login: (provider?: OAuthProviderType) => Promise<{ success: boolean; error?: string }>;
    loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    registerWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

function hasChromeRuntime(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
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
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'awaiting' | 'failed'>('idle');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loginAction = useIpcAction<{ provider?: OAuthProviderType }, AuthResponse>('LOGIN');
    const loginEmailAction = useIpcAction<{ email: string; password: string }, AuthResponse>('LOGIN_EMAIL');
    const registerEmailAction = useIpcAction<{ email: string; password: string }, AuthResponse>('REGISTER_EMAIL');
    const logoutAction = useIpcAction<void, void>('LOGOUT');
    const getAuthStateAction = useIpcAction<Record<string, never>, AuthResponse>('GET_AUTH_STATE');

    // Fetch initial auth state from background
    useEffect(() => {
        let mounted = true;

        if (!hasChromeRuntime()) {
            setUser(null);
            setVerificationStatus('idle');
            setVerificationExpiresAt(null);
            setIsLoading(false);

            return () => {
                mounted = false;
            };
        }

        const fetchAuthState = async (): Promise<void> => {
            const result = await getAuthStateAction({});
            if (!mounted) return;

            if (result.success) {
                setUser(result.data.user ?? null);
                setVerificationStatus(result.data.verificationStatus ?? 'idle');
                setVerificationExpiresAt(result.data.verificationExpiresAt ?? null);
            } else {
                setUser(null);
                setVerificationStatus('idle');
                setVerificationExpiresAt(null);
            }
            setIsLoading(false);
        };

        void fetchAuthState();

        const handleMessage = (message: AuthStateChangedMessage): void => {
            if (message?.type === 'AUTH_STATE_CHANGED') {
                const payload = message.payload || message;
                setUser(payload.user ?? null);
                setVerificationStatus(payload.verificationStatus ?? 'idle');
                setVerificationExpiresAt(payload.verificationExpiresAt ?? null);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        return () => {
            mounted = false;
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (provider: OAuthProviderType = 'google') => {
        setIsLoading(true);
        setError(null);
        const result: ActionResult<AuthResponse> = await loginAction({ provider });
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
            return { success: false, error: result.error };
        }
        if (result.data.user) setUser(result.data.user);
        setIsLoading(false);
        return { success: true };
    }, [loginAction]);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        const result = await loginEmailAction({ email, password });
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
            return { success: false, error: result.error };
        }
        if (result.data.user) setUser(result.data.user);
        setVerificationStatus(result.data.verificationStatus ?? 'idle');
        setVerificationExpiresAt(result.data.verificationExpiresAt ?? null);
        setIsLoading(false);
        return { success: true };
    }, [loginEmailAction]);

    const registerWithEmail = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        const result = await registerEmailAction({ email, password });
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
            return { success: false, error: result.error };
        }
        if (result.data.user) setUser(result.data.user);
        setVerificationStatus(result.data.verificationStatus ?? 'idle');
        setVerificationExpiresAt(result.data.verificationExpiresAt ?? null);
        setIsLoading(false);
        return { success: true };
    }, [registerEmailAction]);

    const logout = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        await logoutAction(undefined);
        setUser(null);
        setVerificationStatus('idle');
        setVerificationExpiresAt(null);
        setIsLoading(false);
    }, [logoutAction]);

    return {
        user,
        verificationStatus,
        verificationExpiresAt,
        isLoading,
        error,
        login,
        loginWithEmail,
        registerWithEmail,
        logout
    };
}
