import {
  isPersistedPopupView,
  type PopupNavigationSnapshot,
  type PersistedPopupView,
} from '@/shared/constants/popup-navigation-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { normalizeMode } from '@/shared/utils/normalize-mode';

export type PopupInitialView =
  | 'WELCOME'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'SETTINGS'
  | 'DASHBOARD'
  | 'AUTH';

export interface PopupOnboardingState {
  hasSeenWelcome: boolean;
}

export interface PopupRouteInput {
  isAuthenticated: boolean;
  onboarding: PopupOnboardingState;
  nav: PopupNavigationSnapshot;
  currentMode: ModeType;
  /** From AuthManager, via useCurrentUser/AuthProvider. */
  verificationStatus?: 'idle' | 'awaiting' | 'failed';
}

export interface PopupRouteResult {
  view: PopupInitialView;
  selectedDomain?: string;
  selectedSection?: string;
  applyMode?: ModeType;
  consumePendingAuthMode?: boolean;
}

export function postLoginViewForMode(_mode: ModeType): PopupInitialView {
  return 'COLLECTIONS';
}

function drillDownContext(
  nav: PopupNavigationSnapshot,
  view: PersistedPopupView
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

function restoredPersistedView(nav: PopupNavigationSnapshot): PopupRouteResult | null {
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
  const { isAuthenticated, onboarding, nav, verificationStatus } = input;

  if (!onboarding.hasSeenWelcome) {
    return { view: 'WELCOME' };
  }

  // Awaiting email confirmation implies no session yet — resume on the
  // verification screen instead of falling through to Mode Selection.
  if (!isAuthenticated && verificationStatus === 'awaiting') {
    return { view: 'AUTH' };
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

  // Interrupted sign-in: user picked a mode and clicked Sign In but closed
  // the popup before completing auth. Resume on AUTH.
  if (nav.pendingAuthMode) {
    return { view: 'AUTH' };
  }

  // Guest home is Collections (Basic has library). Restore last library /
  // settings view.
  const restored = restoredPersistedView(nav);
  if (restored) {
    return restored;
  }

  return { view: 'COLLECTIONS' };
}
