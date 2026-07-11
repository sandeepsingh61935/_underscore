import {
  isPersistedPopupView,
  type PopupNavigationSnapshot,
  type PersistedPopupView,
} from '@/shared/constants/popup-navigation-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { normalizeMode } from '@/shared/utils/normalize-mode';

export type PopupInitialView =
  | 'WELCOME'
  | 'MODE_SELECTION'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'SETTINGS'
  | 'DASHBOARD'
  | 'API_KEY_SETUP'
  | 'UNLOCK_VAULT';

export interface PopupOnboardingState {
  hasSeenWelcome: boolean;
  hasSeenModeSelection: boolean;
}

export interface PopupRouteInput {
  isAuthenticated: boolean;
  onboarding: PopupOnboardingState;
  nav: PopupNavigationSnapshot;
  currentMode: ModeType;
}

export interface PopupRouteResult {
  view: PopupInitialView;
  selectedDomain?: string;
  selectedSection?: string;
  applyMode?: ModeType;
  consumePendingAuthMode?: boolean;
}

function isProMode(mode: ModeType): boolean {
  return mode === 'pro' || mode === 'pro_xai';
}

export function postLoginViewForMode(mode: ModeType): PopupInitialView {
  return isProMode(mode) ? 'UNLOCK_VAULT' : 'COLLECTIONS';
}

function drillDownContext(
  nav: PopupNavigationSnapshot,
  view: PersistedPopupView,
): Pick<PopupRouteResult, 'selectedDomain' | 'selectedSection'> {
  const context: Pick<PopupRouteResult, 'selectedDomain' | 'selectedSection'> = {};

  if ((view === 'DOMAIN_DETAILS' || view === 'SUB_DOMAIN') && nav.lastDomain) {
    context.selectedDomain = nav.lastDomain;
  }
  if (view === 'SUB_DOMAIN' && nav.lastSection) {
    context.selectedSection = nav.lastSection;
  }

  return context;
}

function restoredPersistedView(
  nav: PopupNavigationSnapshot,
): PopupRouteResult | null {
  if (!nav.lastView || !isPersistedPopupView(nav.lastView)) {
    return null;
  }

  return {
    view: nav.lastView,
    ...drillDownContext(nav, nav.lastView),
  };
}

/**
 * Session-first popup route resolver.
 * Auth gates are never restored; sign-in completion is handled via pending mode or home.
 */
export function resolvePopupInitialRoute(input: PopupRouteInput): PopupRouteResult {
  const { isAuthenticated, onboarding, nav } = input;

  if (!onboarding.hasSeenWelcome) {
    return { view: 'WELCOME' };
  }

  if (isAuthenticated) {
    if (nav.pendingAuthMode) {
      const applyMode = normalizeMode(nav.pendingAuthMode);
      return {
        view: postLoginViewForMode(applyMode),
        applyMode,
        consumePendingAuthMode: true,
      };
    }

    const restored = restoredPersistedView(nav);
    if (restored) {
      return restored;
    }

    return { view: 'COLLECTIONS' };
  }

  if (!onboarding.hasSeenModeSelection) {
    return { view: 'MODE_SELECTION' };
  }

  const restored = restoredPersistedView(nav);
  if (restored && restored.view !== 'MODE_SELECTION') {
    return restored;
  }

  return { view: 'COLLECTIONS' };
}
