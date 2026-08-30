import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { isValidTheme, type ThemeType as Theme } from '../../shared/types/theme';
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

/** Shared key with PopupAppProvider — web uses localStorage; extension may also mirror chrome.storage. */
export const THEME_STORAGE_KEY = 'underscore-theme';

/** Read persisted appearance preference (web-safe). Defaults to system. */
export function readStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isValidTheme(saved)) return saved;
    } catch {
        // private mode / blocked storage
    }
    return 'system';
}

/** Persist appearance preference for reload. Always localStorage; chrome.storage when present. */
export function writeStoredTheme(theme: Theme): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // ignore quota / private mode
        }
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
        void chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
    }
}

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
    // Hydrate synchronously so refresh keeps Light/Dark (chrome.storage is extension-only).
    const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

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

    // Entitled paid users may switch Free ↔ Paid; free users only Free.
    const availableModes: Mode[] = isAuthenticated
        ? getEntitlementPaidActive()
            ? ['pro', 'pro_xai']
            : ['pro']
        : ['basic'];

    useEffect(() => {
        const root = document.documentElement;
        const applyResolved = (resolved: 'light' | 'dark'): void => {
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
        };

        if (theme === 'dark') {
            applyResolved('dark');
        } else if (theme === 'light') {
            applyResolved('light');
        } else {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            applyResolved(mq.matches ? 'dark' : 'light');
            const onChange = (e: MediaQueryListEvent): void => {
                applyResolved(e.matches ? 'dark' : 'light');
            };
            mq.addEventListener('change', onChange);
            writeStoredTheme(theme);
            return () => mq.removeEventListener('change', onChange);
        }

        writeStoredTheme(theme);
        return undefined;
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
        // sign_in / upgrade / sign_out are handled by Settings UI (mode selection removed)
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
