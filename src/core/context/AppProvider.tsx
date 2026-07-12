import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { TypePresetBootstrap } from '@/ui-system/hooks/useTypePreset';
import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';

import type { IDataProvider } from '../../shared/interfaces/i-data-provider';

export interface AppContextType {
    // Authentication (web: from WebAuthProvider)
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => Promise<void>;

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

function AppProviderInner({
    children,
    dataProvider,
}: {
    children: React.ReactNode;
    dataProvider: IDataProvider;
}): React.ReactElement {
    const { user, isAuthenticated, isLoading: authLoading, login, logout } = useWebAuth();
    const { currentMode, persistMode } = usePersistedMode(isAuthenticated);
    const [isLoading, setIsLoading] = useState(false);
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

    const availableModes: Mode[] = isAuthenticated
        ? ['basic', 'pro', 'pro_xai']
        : ['basic'];

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

    const setMode = useCallback((mode: Mode) => {
        if ((mode === 'pro' || mode === 'pro_xai') && !isAuthenticated) {
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
        modeReady: !authLoading,
        setMode,
        availableModes,
        theme,
        setTheme,
        isLoading: isLoading || authLoading,
        setIsLoading,
        dataProvider,
    };

    return (
        <AppContext.Provider value={value}>
            <TypePresetBootstrap />
            {children}
        </AppContext.Provider>
    );
}

export const AppProvider: React.FC<{ children: React.ReactNode, dataProvider: IDataProvider }> = ({ children, dataProvider }) => {
    return (
        <AppProviderInner dataProvider={dataProvider}>
            {children}
        </AppProviderInner>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};
