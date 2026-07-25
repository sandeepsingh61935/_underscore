import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { TypePresetBootstrap } from '@/ui-system/hooks/useTypePreset';
import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import {
  BillingProvider,
  useModeSyncCallback,
} from '@/features/billing/BillingProvider';
import { computeEffectiveMode } from '@/shared/billing';

import type { IDataProvider } from '../../shared/interfaces/i-data-provider';

export interface AppContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => Promise<void>;

    currentMode: Mode;
    modeReady: boolean;
    setMode: (mode: Mode) => void;
    availableModes: Mode[];

    theme: Theme;
    setTheme: (theme: Theme) => void;

    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

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
    const onEffectiveMode = useModeSyncCallback(persistMode);
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setThemeState] = useState<Theme>('system');

    const supabase = useMemo(() => {
        try {
            return getWebSupabaseClient();
        } catch {
            return null;
        }
    }, []);

    const getAccessToken = useCallback(async () => {
        if (!supabase) return null;
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
    }, [supabase]);

    useEffect(() => {
        if (window.chrome && chrome.storage) {
            chrome.storage.local.get(['underscore-theme']).then(data => {
                if (data['underscore-theme']) {
                    setThemeState(data['underscore-theme'] as Theme);
                }
            });
        }
    }, []);

    // Mode is derived for signed-in users; do not offer free switch to Paid.
    const availableModes: Mode[] = isAuthenticated
        ? currentMode === 'pro_xai'
            ? ['pro_xai']
            : ['pro']
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
        // Paid is not a free-user selection — only billing sync writes pro_xai
        if (mode === 'pro_xai' && currentMode !== 'pro_xai') {
            return;
        }
        void persistMode(mode);
    }, [isAuthenticated, persistMode, currentMode]);

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

    const webBilling = supabase
        ? { supabase, getAccessToken }
        : undefined;

    return (
        <AppContext.Provider value={value}>
            <BillingProvider
                isAuthenticated={isAuthenticated}
                onEffectiveMode={onEffectiveMode}
                web={webBilling}
            >
                <TypePresetBootstrap />
                {children}
            </BillingProvider>
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

// re-export for tests that might want projection
export { computeEffectiveMode };
