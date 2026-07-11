// src/entrypoints/popup/chrome.ts

export type ActiveTab = 'home' | 'collections' | 'settings';
export type ViewKey =
  | 'LOADING'
  | 'WELCOME'
  | 'MODE_SELECTION'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'AUTH'
  | 'UNLOCK_VAULT'
  | 'SETTINGS'
  | 'DASHBOARD'
  | 'API_KEY_SETUP'
  | 'LLM_STREAMING';

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
  onBackFromApiKeySetup: () => void;
  onBackFromLlmStreaming: () => void;
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
    COLLECTIONS: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
    DOMAIN_DETAILS: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToCollections,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
    SUB_DOMAIN: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToDomain,
      backLabel: handlers.subDomainBackLabel(),
      onSwitch: handlers.onSwitch,
    },
    AUTH: {
      title: '_underscore · sign in',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    UNLOCK_VAULT: {
      title: '_underscore · vault',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: false,
      modeId: handlers.getModeId(),
      onSwitch: handlers.onSwitch,
    },
    SETTINGS: {
      title: '_underscore · settings',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'settings',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackFromSettings,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
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
    API_KEY_SETUP: {
      title: '_underscore · models',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: false,
      modeId: handlers.getModeId(),
      onBack: handlers.onBackFromApiKeySetup,
      backLabel: 'Settings',
      onSwitch: handlers.onSwitch,
    },
    LLM_STREAMING: {
      title: '_underscore · summary',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: false,
      modeId: handlers.getModeId(),
      onBack: handlers.onBackFromLlmStreaming,
      backLabel: 'Close',
      onSwitch: handlers.onSwitch,
    },
  };
}
