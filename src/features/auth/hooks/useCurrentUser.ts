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

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    provider: OAuthProviderType | null;
}

/**
 * Hook to access current user auth state from background AuthManager
 * Uses Chrome messaging to communicate with background service worker
 */
export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
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
                } else {
                    console.warn('[useCurrentUser] Failed to get auth state:', response?.error);
                    setUser(null);
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

        // Listen for auth state changes from background
        const handleMessage = (message: any) => {
            if (message?.type === 'AUTH_STATE_CHANGED') {
                console.log('[useCurrentUser] Auth state changed:', message);
                setUser(message.user || message.payload?.user || null);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        return () => {
            mounted = false;
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    // Login function - triggers OAuth via background
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

            console.log('[useCurrentUser] LOGIN response:', response);

            if (response?.success && response.data?.user) {
                setUser(response.data.user);
                return { success: true, user: response.data.user };
            } else {
                const errorMsg = response?.error || 'Login failed';
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            const errorMsg = (err as Error).message;
            console.error('[useCurrentUser] Login error:', err);
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
        } catch (err) {
            console.error('[useCurrentUser] Logout error:', err);
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { user, isLoading, error, login, logout };
}
