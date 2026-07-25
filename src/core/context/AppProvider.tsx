import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { ThemeType as Theme } from '../../shared/types/theme';
import type { User } from '../../background/auth/interfaces/i-auth-manager';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { TypePresetBootstrap } from '@/ui-system/hooks/useTypePreset';
import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { useBillingEntitlement } from '@/features/billing/hooks/useBillingEntitlement';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { isBillingDevOverrideEnabled } from '@/shared/billing/dev-override';

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

    // Billing (Polar entitlements)
    billingEntitlement: BillingEntitlement;
    billingReady: boolean;
    billingBusy: boolean;
    billingError: string | null;
    startCheckout: () => Promise<void>;
    openBillingPortal: () => Promise<void>;
    refreshBilling: () => Promise<void>;

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

    const billing = useBillingEntitlement({
        supabase,
        getAccessToken,
        isAuthenticated,
    });

    const { currentMode, persistMode } = usePersistedMode(isAuthenticated, {
        entitlement: billing.entitlement,
        entitlementReady: billing.ready,
    });
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
        ? isBillingDevOverrideEnabled() || billing.entitlement.isPaidActive
            ? ['basic', 'pro', 'pro_xai']
            : ['basic', 'pro']
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
        billingEntitlement: billing.entitlement,
        billingReady: billing.ready,
        billingBusy: billing.busy,
        billingError: billing.error,
        startCheckout: () => billing.startCheckout(),
        openBillingPortal: () => billing.openPortal(),
        refreshBilling: billing.refresh,
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
