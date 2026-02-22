import { useState, useEffect, useCallback } from 'react';
import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';

export interface User {
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    photoUrl?: string;
}

export interface AuthStateData {
    user: User | null;
    verificationStatus?: 'idle' | 'awaiting' | 'failed';
    verificationExpiresAt?: number | null;
}



/**
 * Hook to access current user auth state from background AuthManager
 * Uses Chrome messaging to communicate with background service worker
 */
export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'awaiting' | 'failed'>('idle');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial auth state from background
    useEffect(() => {
        let mounted = true;

        const fetchAuthState = async () => {
            try {
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_AUTH_STATE',
                    payload: {},
                    timestamp: Date.now()
                });

                if (!mounted) return;

                if (response?.success && response.data) {
                    setUser(response.data.user);
                    setVerificationStatus(response.data.verificationStatus || 'idle');
                    setVerificationExpiresAt(response.data.verificationExpiresAt || null);
                } else {
                    console.warn('[useCurrentUser] Failed to get auth state:', response?.error);
                    setUser(null);
                    setVerificationStatus('idle');
                    setVerificationExpiresAt(null);
                }
            } catch (err) {
                if (!mounted) return;
                console.error('[useCurrentUser] Error fetching auth state:', err);
                setError((err as Error).message);
                setUser(null);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchAuthState();

        const handleMessage = (message: any) => {
            if (message?.type === 'AUTH_STATE_CHANGED') {
                console.log('[useCurrentUser] Auth state changed:', message);
                const payload = message.payload || message;
                setUser(payload.user || null);
                setVerificationStatus(payload.verificationStatus || 'idle');
                setVerificationExpiresAt(payload.verificationExpiresAt || null);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        return () => {
            mounted = false;
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    // Login function
    const login = useCallback(async (provider: OAuthProviderType = 'google') => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('[useCurrentUser] Sending LOGIN request to background...');
            const response = await chrome.runtime.sendMessage({
                type: 'LOGIN',
                payload: { provider },
                timestamp: Date.now()
            });

            console.log('[useCurrentUser] Received LOGIN response:', response);

            if (!response || !response.success) {
                const errorMsg = response?.error || 'Login failed - no response from background context';
                console.error('[useCurrentUser] Login failed:', errorMsg);
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            if (response.data && response.data.user) {
                console.log('[useCurrentUser] Login successful, setting user state');
                setUser(response.data.user);
            }

            return { success: true };
        } catch (err) {
            // Handle offline case specifically
            if (!navigator.onLine || (err && err.toString().includes('fetch'))) {
                const errorMsg = 'Please connect to the internet to sign in.';
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            const errorMsg = (err as Error).message;
            console.error('[useCurrentUser] Login error:', err);
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Email Login function
    const loginWithEmail = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('[useCurrentUser] Sending LOGIN_EMAIL request to background...');
            const response = await chrome.runtime.sendMessage({
                type: 'LOGIN_EMAIL',
                payload: { email, password },
                timestamp: Date.now()
            });

            console.log('[useCurrentUser] Received LOGIN_EMAIL response:', response);

            if (!response || !response.success) {
                const errorMsg = response?.error || 'Email login failed - no response from background context';
                console.error('[useCurrentUser] Email login failed:', errorMsg);
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            if (response.data && response.data.user) {
                console.log('[useCurrentUser] Email login successful, setting user state');
                setUser(response.data.user);
            }

            if (response.data) {
                setVerificationStatus(response.data.verificationStatus || 'idle');
                setVerificationExpiresAt(response.data.verificationExpiresAt || null);
            }

            return { success: true };
        } catch (err) {
            const errorMsg = (err as Error).message;
            console.error('[useCurrentUser] Email login error:', err);
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Email Registration function
    const registerWithEmail = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('[useCurrentUser] Sending REGISTER_EMAIL request to background...');
            const response = await chrome.runtime.sendMessage({
                type: 'REGISTER_EMAIL',
                payload: { email, password },
                timestamp: Date.now()
            });

            console.log('[useCurrentUser] Received REGISTER_EMAIL response:', response);

            if (!response || !response.success) {
                const errorMsg = response?.error || 'Email registration failed - no response from background context';
                console.error('[useCurrentUser] Email registration failed:', errorMsg);
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            if (response.data && response.data.user) {
                console.log('[useCurrentUser] Email registration successful, setting user state');
                setUser(response.data.user);
            }

            if (response.data) {
                setVerificationStatus(response.data.verificationStatus || 'idle');
                setVerificationExpiresAt(response.data.verificationExpiresAt || null);
            }

            return { success: true };
        } catch (err) {
            const errorMsg = (err as Error).message;
            console.error('[useCurrentUser] Email registration error:', err);
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await chrome.runtime.sendMessage({
                type: 'LOGOUT',
                payload: {},
                timestamp: Date.now()
            });
            setUser(null);
            setVerificationStatus('idle');
            setVerificationExpiresAt(null);
        } catch (err) {
            console.error('[useCurrentUser] Logout error:', err);
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
