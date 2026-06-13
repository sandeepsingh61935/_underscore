import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';

import type { IDataProvider } from '../../shared/interfaces/i-data-provider';

export interface AppContextType {
    // Authentication
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => void;

    // Mode Management
    currentMode: Mode;
    modeReady: boolean;
    setMode: (mode: Mode) => void;
    availableModes: Mode[];

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // Loading states
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    // Data Provider
    dataProvider: IDataProvider;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode, dataProvider: IDataProvider }> = ({ children, dataProvider }) => {
    // Authentication state - initialize synchronously from localStorage
    const getInitialUser = () => {
        try {
            const saved = localStorage.getItem('underscore-user');
            return saved ? JSON.parse(saved) as User : null;
        } catch (e) {
            return null;
        }
    };

    const initialUser = getInitialUser();
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
    const [user, setUser] = useState<User | null>(initialUser);

    // Mode state - bridge to Chrome Storage via usePersistedMode
    const { currentMode, modeReady, persistMode } = usePersistedMode(isAuthenticated);
    const [isLoading, setIsLoading] = useState(false);

    // Theme state - get from chrome.storage or system preference
    const [theme, setThemeState] = useState<Theme>('system');

    useEffect(() => {
        if (window.chrome && chrome.storage) {
            chrome.storage.local.get(['underscore-theme']).then(data => {
                if (data['underscore-theme']) {
                    setThemeState(data['underscore-theme'] as Theme);
                }
            });
        }
    }, []);

    // Available modes depends on auth state
    const availableModes: Mode[] = isAuthenticated
        ? ['ephemeral', 'local', 'cloud', 'ai']
        : ['ephemeral', 'local'];

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
        
        if (window.chrome && chrome.storage) {
            chrome.storage.local.set({ 'underscore-theme': theme });
        }
    }, [theme]);

    const login = useCallback((newUser: User) => {
        setUser(newUser);
        setIsAuthenticated(true);
        // Dispatch Auth sync intent instead of using localStorage directly
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'SYNC_AUTH_SESSION',
                session: newUser // Simplification for now
            });
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setIsAuthenticated(false);
        persistMode('ephemeral'); // Reset to ephemeral mode on logout
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'SYNC_AUTH_SESSION', session: null });
        }
    }, [persistMode]);

    const setMode = useCallback((mode: Mode) => {
        // Cloud and ai require authentication
        if ((mode === 'cloud' || mode === 'ai') && !isAuthenticated) {
            return;
        }
        persistMode(mode);
    }, [isAuthenticated, persistMode]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const value: AppContextType = {
        isAuthenticated,
        user,
        login,
        logout,
        currentMode,
        modeReady: true,
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

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};
