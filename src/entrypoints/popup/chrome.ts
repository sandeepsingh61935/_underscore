// src/entrypoints/popup/chrome.ts

import type { AccountPillLabel } from '@/shared/utils/account-pill';

export type ActiveTab = 'home' | 'collections' | 'settings';
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
  subDomainBackLabel: () => string;
  getModeId: () => string;
  getAccountPill: () => AccountPillLabel | null;
  onAccountPillClick: () => void;
}

export type ChromeMap = Record<ViewKey, PopupChrome>;

const BRAND = '_underscore';

export function buildChrome(handlers: ChromeHandlers): ChromeMap {
  // Title strip is brand-only (no place label, no PAID/Guest pill).
  void handlers.getAccountPill;
  void handlers.onAccountPillClick;

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
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      accountPill: null,
    },
    DOMAIN_DETAILS: {
      title: `${BRAND} · library`,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToCollections,
      backLabel: 'Library',
      accountPill: null,
    },
    SUB_DOMAIN: {
      title: `${BRAND} · library`,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToDomain,
      backLabel: handlers.subDomainBackLabel(),
      accountPill: null,
    },
    AUTH: {
      title: `${BRAND} · sign in`,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
      accountPill: null,
    },
    SETTINGS: {
      title: `${BRAND} · settings`,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'settings',
      onTabChange: handlers.onTabChange,
      accountPill: null,
    },
    DASHBOARD: {
      title: BRAND,
      place: '',
      brand: BRAND,
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'home',
      onTabChange: handlers.onTabChange,
      accountPill: null,
    },
  };
}
