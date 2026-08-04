// src/entrypoints/popup/chrome.ts

import type { AccountPillLabel } from '@/shared/utils/account-pill';

export type ActiveTab = 'home' | 'collections' | 'ask' | 'settings';
export type ViewKey =
  | 'LOADING'
  | 'WELCOME'
  | 'MODE_SELECTION'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'AUTH'
  | 'SETTINGS'
  | 'ASK'
  | 'DASHBOARD'
  | 'API_KEY_SETUP'
  | 'LLM_STREAMING';

export interface PopupChrome {
  title: string;
  place: string;
  brand: string;
  showTitleStrip: boolean;
  showModeHeader: boolean;
  showTabBar: boolean;
  modeId?: string;
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onBack?: () => void;
  backLabel?: string;
  /** @deprecated ModeHeader switch removed from tab roots; optional for gradual migration */
  onSwitch?: () => void;
  accountPill?: AccountPillLabel | null;
  onAccountPillClick?: () => void;
}

export interface ChromeHandlers {
  onTabChange: (tab: ActiveTab) => void;
  /** Optional; no longer wired onto tab-root chrome */
  onSwitch?: () => void;
  onBackToCollections: () => void;
  onBackToDomain: () => void;
  onBackFromSettings: () => void;
  onBackFromApiKeySetup: () => void;
  onBackFromLlmStreaming: () => void;
  subDomainBackLabel: () => string;
  getModeId: () => string;
  getAccountPill: () => AccountPillLabel | null;
  onAccountPillClick: () => void;
}

export type ChromeMap = Record<ViewKey, PopupChrome>;

const BRAND = '_underscore';

export function buildChrome(handlers: ChromeHandlers): ChromeMap {
  const accountPill = handlers.getAccountPill();
  const onAccountPillClick = handlers.onAccountPillClick;

  return {
    LOADING: {
      title: BRAND,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
      accountPill: null,
    },
    WELCOME: {
      title: BRAND,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
      accountPill: null,
    },
    MODE_SELECTION: {
      title: BRAND,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
      accountPill: null,
    },
    COLLECTIONS: {
      title: `${BRAND} · library`,
      place: 'Library',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      accountPill,
      onAccountPillClick,
    },
    DOMAIN_DETAILS: {
      title: `${BRAND} · library`,
      place: 'Library',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToCollections,
      backLabel: 'Library',
      accountPill,
      onAccountPillClick,
    },
    SUB_DOMAIN: {
      title: `${BRAND} · library`,
      place: 'Library',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToDomain,
      backLabel: handlers.subDomainBackLabel(),
      accountPill,
      onAccountPillClick,
    },
    AUTH: {
      title: `${BRAND} · sign in`,
      place: 'Sign in',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
      accountPill: null,
    },
    SETTINGS: {
      title: `${BRAND} · settings`,
      place: 'Settings',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'settings',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackFromSettings,
      backLabel: 'Library',
      accountPill,
      onAccountPillClick,
    },
    ASK: {
      title: `${BRAND} · ask`,
      place: 'Ask',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'ask',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackFromSettings,
      backLabel: 'Library',
      accountPill,
      onAccountPillClick,
    },
    DASHBOARD: {
      title: BRAND,
      place: 'Home',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'home',
      onTabChange: handlers.onTabChange,
      accountPill,
      onAccountPillClick,
    },
    API_KEY_SETUP: {
      title: `${BRAND} · models`,
      place: 'Models',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: false,
      modeId: handlers.getModeId(),
      onBack: handlers.onBackFromApiKeySetup,
      backLabel: 'Settings',
      accountPill,
      onAccountPillClick,
    },
    LLM_STREAMING: {
      title: `${BRAND} · summary`,
      place: 'Summary',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: false,
      modeId: handlers.getModeId(),
      onBack: handlers.onBackFromLlmStreaming,
      backLabel: 'Close',
      accountPill,
      onAccountPillClick,
    },
  };
}
