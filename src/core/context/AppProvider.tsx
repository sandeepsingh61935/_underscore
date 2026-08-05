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
import { computeEffectiveMode, getEntitlementPaidActive } from '@/shared/billing';
import { resolveModeTransition } from '@/shared/utils/mode-transition';

import type { IDataProvider } from '../../shared/interfaces/i-data-provider';

export interface AppContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => Promise<void>;

    currentMode: Mode;
    modeReady: boolean;
    /**
     * Persist mode when transition rules allow.
     * Free→Paid requires isPaidActive (entitlement); Paid→Free always allowed when signed in.
     */
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

    // Entitled paid users may switch Free ↔ Paid; free users only Free.
    const availableModes: Mode[] = isAuthenticated
        ? getEntitlementPaidActive()
            ? ['pro', 'pro_xai']
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
        const decision = resolveModeTransition({
            from: currentMode,
            to: mode,
            isAuthenticated,
            isPaidActive: getEntitlementPaidActive(),
        });
        if (decision.kind === 'persist' && decision.mode) {
            void persistMode(decision.mode);
        }
        // sign_in / upgrade / sign_out are handled by Settings / ModeSelection UI
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
                currentMode={currentMode}
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
