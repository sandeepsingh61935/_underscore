import React, { useContext, useState, useCallback, useEffect } from 'react';
import { AppContext, type AppContextType } from './AppProvider';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';

// V2 spec: all modes share --accent (terracotta); modes are distinguished by glyph + label only.
// No per-mode color map needed.
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import type { IDataProvider } from '../../shared/interfaces/i-data-provider';


interface PopupAppProviderProps {
    children: React.ReactNode;
    /** User from useCurrentUser - single source of truth */
    user: User | null;
    /** Auth state from useCurrentUser */
    isAuthenticated: boolean;
    /** Optional logout handler */
    onLogout?: () => void;
    /** Data Provider for collections */
    dataProvider: IDataProvider;
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
    onLogout,
    dataProvider
}) => {
    // Mode state — persisted in chrome.storage.local, reactive via onChanged
    const { currentMode, modeReady, persistMode } = usePersistedMode(propIsAuthenticated);
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
        ? ['pro', 'pro_xai']
        : ['basic'];

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.add('light');
        } else if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(prefersDark ? 'dark' : 'light');
        }
        localStorage.setItem('underscore-theme', theme);
    }, [theme]);

    // No-op login - auth is managed by useCurrentUser
    const login = useCallback((_user: User) => {
        console.warn('[PopupAppProvider] login() called but auth is managed by useCurrentUser');
    }, []);

    // Logout delegates to the prop handler
    const logout = useCallback(async () => {
        if (onLogout) {
            await onLogout();
        } else {
            console.warn('[PopupAppProvider] logout() called but no onLogout handler provided');
        }
    }, [onLogout]);



    const setMode = useCallback(async (mode: Mode) => {
        // 1. Persist to chrome.storage.local (auth guard is inside persistMode)
        await persistMode(mode);

        // 2. The Background Worker handles broadcasting this state change to Content Scripts
        // seamlessly via the EventBus bridge. No imperative chrome.tabs messaging needed here.
    }, [persistMode]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const value: AppContextType = {
        isAuthenticated: propIsAuthenticated,
        user: propUser,
        login,
        logout,
        currentMode,
        modeReady,
        setMode,
        availableModes,
        theme,
        setTheme,
        isLoading,
        setIsLoading,
        dataProvider,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const usePopupApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('usePopupApp must be used within PopupAppProvider');
    }
    return context;
};

// Re-export useApp from here is not needed as consumers should import from AppProvider
// But for compatibility if anything was importing useApp from here (though they shouldn't)
export { useApp } from './AppProvider';
