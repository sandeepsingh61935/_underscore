import React, { useContext, useState, useCallback, useEffect } from 'react';

import type { User } from '../../background/auth/interfaces/i-auth-manager';
import type { IDataProvider } from '../../shared/interfaces/i-data-provider';
import type { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import type { ThemeType as Theme } from '../../shared/types/theme';

import { AppContext, type AppContextType } from './AppProvider';

import { BillingProvider, useModeSyncCallback } from '@/features/billing/BillingProvider';
import { getEntitlementPaidActive } from '@/shared/billing';
import { resolveModeTransition } from '@/shared/utils/mode-transition';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { TypePresetBootstrap } from '@/ui-system/hooks/useTypePreset';

interface PopupAppProviderProps {
  children: React.ReactNode;
  user: User | null;
  isAuthenticated: boolean;
  onLogout?: () => void;
  dataProvider: IDataProvider;
}

/**
 * Popup-specific AppProvider: auth via props; billing via IPC (MessageBus).
 */
export const PopupAppProvider: React.FC<PopupAppProviderProps> = ({
  children,
  user: propUser,
  isAuthenticated: propIsAuthenticated,
  onLogout,
  dataProvider,
}) => {
  const { currentMode, modeReady, persistMode } = usePersistedMode(propIsAuthenticated);
  const onEffectiveMode = useModeSyncCallback(persistMode);
  const [isLoading, setIsLoading] = useState(false);

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('underscore-theme') as Theme | null;
    if (saved) return saved;

    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const availableModes: Mode[] = propIsAuthenticated
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
    localStorage.setItem('underscore-theme', theme);
  }, [theme]);

  const login = useCallback((_user: User) => {
    console.warn(
      '[PopupAppProvider] login() called but auth is managed by useCurrentUser'
    );
  }, []);

  const logout = useCallback(async () => {
    if (onLogout) {
      await onLogout();
    } else {
      console.warn('[PopupAppProvider] logout() called but no onLogout handler provided');
    }
  }, [onLogout]);

  const setMode = useCallback(
    async (mode: Mode) => {
      const decision = resolveModeTransition({
        from: currentMode,
        to: mode,
        isAuthenticated: propIsAuthenticated,
        isPaidActive: getEntitlementPaidActive(),
      });
      if (decision.kind === 'persist' && decision.mode) {
        await persistMode(decision.mode);
      }
    },
    [persistMode, currentMode, propIsAuthenticated]
  );

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

  return (
    <AppContext.Provider value={value}>
      <BillingProvider
        isAuthenticated={propIsAuthenticated}
        currentMode={currentMode}
        onEffectiveMode={onEffectiveMode}
      >
        <TypePresetBootstrap />
        {children}
      </BillingProvider>
    </AppContext.Provider>
  );
};

export const usePopupApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('usePopupApp must be used within PopupAppProvider');
  }
  return context;
};

export { useApp } from './AppProvider';
