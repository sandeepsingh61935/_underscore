import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';

export interface User {
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    photoUrl?: string;
}

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
    /** Login with OAuth provider */
    login: (provider?: OAuthProviderType) => Promise<{ success: boolean; error?: string }>;
    /** Logout current user */
    logout: () => Promise<void>;
    /** Clear error state */
    clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to access auth context
 */
export function useAuth() {
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
 * Authentication provider that connects to background AuthManager
 * via Chrome messaging
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [status, setStatus] = useState<AuthStatus>(initialUser ? 'authenticated' : 'loading');
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = status === 'authenticated';
    const isLoading = status === 'loading';

    // Fetch initial auth state from background
    useEffect(() => {
        let mounted = true;

        const fetchAuthState = async () => {
            try {
                // Check if chrome runtime is available (extension context)
                if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                    // Not in extension context - keep current state
                    if (mounted && status === 'loading') {
                        setStatus('unauthenticated');
                    }
                    return;
                }

                const response = await chrome.runtime.sendMessage({
                    type: 'GET_AUTH_STATE',
                    payload: {},
                    timestamp: Date.now()
                });

                if (!mounted) return;

                if (response?.success && response.data?.user) {
                    setUser(response.data.user);
                    setStatus('authenticated');
                } else {
                    setUser(null);
                    setStatus('unauthenticated');
                }
            } catch (err) {
                if (!mounted) return;
                console.error('[AuthProvider] Error fetching auth state:', err);
                setUser(null);
                setStatus('unauthenticated');
            }
        };

        if (status === 'loading') {
            fetchAuthState();
        }

        // Listen for auth state changes from background
        const handleMessage = (message: any) => {
            if (message?.type === 'AUTH_STATE_CHANGED') {
                const newUser = message.user || message.payload?.user || null;
                setUser(newUser);
                setStatus(newUser ? 'authenticated' : 'unauthenticated');
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(handleMessage);
            return () => {
                mounted = false;
                chrome.runtime.onMessage.removeListener(handleMessage);
            };
        }

        return () => { mounted = false; };
    }, [status]);

    // Login function
    const login = useCallback(async (provider: OAuthProviderType = 'google') => {
        setStatus('loading');
        setError(null);

        try {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                throw new Error('Not in extension context');
            }

            const response = await chrome.runtime.sendMessage({
                type: 'LOGIN',
                payload: { provider },
                timestamp: Date.now()
            });

            if (response?.success && response.data?.user) {
                setUser(response.data.user);
                setStatus('authenticated');
                return { success: true };
            } else {
                const errorMsg = response?.error || 'Login failed';
                setError(errorMsg);
                setStatus('unauthenticated');
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            const errorMsg = (err as Error).message;
            setError(errorMsg);
            setStatus('unauthenticated');
            return { success: false, error: errorMsg };
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        setStatus('loading');
        setError(null);

        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                await chrome.runtime.sendMessage({
                    type: 'LOGOUT',
                    payload: {},
                    timestamp: Date.now()
                });
            }
            setUser(null);
            setStatus('unauthenticated');
        } catch (err) {
            console.error('[AuthProvider] Logout error:', err);
            // Still clear user on error - logout should always succeed locally
            setUser(null);
            setStatus('unauthenticated');
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            status,
            isAuthenticated,
            isLoading,
            error,
            login,
            logout,
            clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook for auth-dependent rendering
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
