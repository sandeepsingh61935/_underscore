import { createContext, useContext } from 'react';

import type { User } from '../../background/auth/interfaces/i-auth-manager';
import type { IDataProvider } from '../../shared/interfaces/i-data-provider';
import type { ModeType as Mode } from '../../shared/schemas/mode-state-schemas';
import { isValidTheme, type ThemeType as Theme } from '../../shared/types/theme';

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

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
