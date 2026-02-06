import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
interface PopupAppContextType {
    // Authentication - passed via props, not localStorage
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => void;

    // Mode Management
    currentMode: Mode;
    setMode: (mode: Mode) => void;
    availableModes: Mode[];

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // Loading states
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const PopupAppContext = createContext<PopupAppContextType | undefined>(undefined);

interface PopupAppProviderProps {
    children: React.ReactNode;
    /** User from useCurrentUser - single source of truth */
    user: User | null;
    /** Auth state from useCurrentUser */
    isAuthenticated: boolean;
    /** Optional logout handler */
    onLogout?: () => void;
}

/**
 * Popup-specific AppProvider that receives auth state via props
 * instead of managing it via localStorage.
 * 
 * This eliminates the dual-auth race condition between useCurrentUser
 * (Chrome messaging) and AppProvider (localStorage).
 */
export const PopupAppProvider: React.FC<PopupAppProviderProps> = ({
    children,
    user: propUser,
    isAuthenticated: propIsAuthenticated,
    onLogout
}) => {
    // Mode state
    const [currentMode, setCurrentMode] = useState<Mode>('walk');
    const [isLoading, setIsLoading] = useState(false);

    // Theme state - still use localStorage for theme preference
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('underscore-theme') as Theme | null;
        if (saved) return saved;

        // Check system preference
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    // Available modes depends on auth state
    const availableModes: Mode[] = propIsAuthenticated
        ? ['walk', 'sprint', 'vault', 'neural']
        : ['walk', 'sprint'];

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'system');
        if (theme !== 'light' && theme !== 'system') {
            root.classList.add(theme);
        }
        localStorage.setItem('underscore-theme', theme);
    }, [theme]);

    // No-op login - auth is managed by useCurrentUser
    const login = useCallback((_user: User) => {
        console.warn('[PopupAppProvider] login() called but auth is managed by useCurrentUser');
    }, []);

    // Logout delegates to the prop handler
    const logout = useCallback(() => {
        if (onLogout) {
            onLogout();
        } else {
            console.warn('[PopupAppProvider] logout() called but no onLogout handler provided');
        }
    }, [onLogout]);

    const setMode = useCallback((mode: Mode) => {
        // Vault and Neural require authentication
        if ((mode === 'vault' || mode === 'neural') && !propIsAuthenticated) {
            return;
        }
        setCurrentMode(mode);
    }, [propIsAuthenticated]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const value: PopupAppContextType = {
        isAuthenticated: propIsAuthenticated,
        user: propUser,
        login,
        logout,
        currentMode,
        setMode,
        availableModes,
        theme,
        setTheme,
        isLoading,
        setIsLoading,
    };

    return <PopupAppContext.Provider value={value}>{children}</PopupAppContext.Provider>;
};

export const usePopupApp = () => {
    const context = useContext(PopupAppContext);
    if (context === undefined) {
        throw new Error('usePopupApp must be used within PopupAppProvider');
    }
    return context;
};

/**
 * useApp hook that works with both AppProvider and PopupAppProvider
 * This allows shared components like Header to work in both contexts
 */
export const useApp = () => {
    const context = useContext(PopupAppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within PopupAppProvider');
    }
    return context;
};
