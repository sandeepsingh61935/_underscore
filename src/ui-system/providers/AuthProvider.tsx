import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

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

    const loginAction = useIpcAction<{ provider?: OAuthProviderType }, { user?: User }>('LOGIN');
    const logoutAction = useIpcAction<void, void>('LOGOUT');
    const getAuthStateAction = useIpcAction<Record<string, never>, { user?: User }>('GET_AUTH_STATE');

    // Fetch initial auth state from background
    useEffect(() => {
        let mounted = true;

        const fetchAuthState = async () => {
            if (status !== 'loading') return;
            const result = await getAuthStateAction({});
            if (!mounted) return;

            if (result.success && result.data.user) {
                setUser(result.data.user);
                setStatus('authenticated');
            } else {
                setUser(null);
                setStatus('unauthenticated');
            }
        };

        void fetchAuthState();

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
    }, [status, getAuthStateAction]);

    // Login function
    const login = useCallback(async (provider: OAuthProviderType = 'google') => {
        setStatus('loading');
        setError(null);

        const result = await loginAction({ provider });

        if (result.success && result.data.user) {
            setUser(result.data.user);
            setStatus('authenticated');
            return { success: true };
        }

        const errorMsg = result.success ? 'Login failed' : result.error;
        setError(errorMsg);
        setStatus('unauthenticated');
        return { success: false, error: errorMsg };
    }, [loginAction]);

    // Logout function
    const logout = useCallback(async () => {
        setStatus('loading');
        setError(null);

        await logoutAction(undefined);
        setUser(null);
        setStatus('unauthenticated');
    }, [logoutAction]);

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
