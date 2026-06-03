// src/entrypoints/popup/chrome.ts
import type { ReactNode } from 'react';

export type ActiveTab = 'home' | 'collections' | 'capture' | 'settings';
export type ViewKey =
  | 'LOADING'
  | 'WELCOME'
  | 'MODE_SELECTION'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'AUTH'
  | 'SETTINGS'
  | 'DASHBOARD';

export interface PopupChrome {
  title: string;
  showTitleStrip: boolean;
  showModeHeader: boolean;
  showTabBar: boolean;
  modeId?: string;
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onBack?: () => void;
  backLabel?: string;
  onSwitch?: () => void;
}

export interface ChromeHandlers {
  onTabChange: (tab: ActiveTab) => void;
  onSwitch: () => void;
  onBackToCollections: () => void;
  onBackToDomain: () => void;
  onBackFromSettings: () => void;
  subDomainBackLabel: () => string;
  getModeId: () => string;
}

export type ChromeMap = Record<ViewKey, PopupChrome>;

export function buildChrome(handlers: ChromeHandlers): ChromeMap {
  return {
    LOADING: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    WELCOME: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    MODE_SELECTION: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    COLLECTIONS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    DOMAIN_DETAILS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    SUB_DOMAIN: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    AUTH: {
      title: '_underscore · sign in',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    SETTINGS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    DASHBOARD: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'home',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
  };
}
