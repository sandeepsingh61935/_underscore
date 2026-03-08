import React, { useContext, useState, useCallback, useEffect } from 'react';
import { AppContext, type AppContextType } from './AppProvider';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';


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
    // Mode state — persisted in chrome.storage.local, reactive via onChanged
    const { currentMode, persistMode } = usePersistedMode(propIsAuthenticated);
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

    const setMode = useCallback(async (mode: Mode) => {
        // 1. Persist to chrome.storage.local (auth guard is inside persistMode)
        await persistMode(mode);

        // 2. Also transmit to active tab's content script for immediate effect
        try {
            if (chrome?.tabs) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'SET_MODE',
                        mode: mode,
                        timestamp: Date.now()
                    });
                    console.log(`[PopupAppProvider] Transmitted SET_MODE (${mode}) to tab ${tab.id}`);
                }
            }
        } catch (err) {
            // Ignore — content script may not be injected on chrome:// or empty tabs
        }
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
        setMode,
        availableModes,
        theme,
        setTheme,
        isLoading,
        setIsLoading,
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
