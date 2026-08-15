import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export const POPUP_NAV_STORAGE_KEYS = {
  lastView: 'underscore_last_popup_view',
  lastDomain: 'underscore_last_selected_domain',
  lastSection: 'underscore_last_selected_section',
  lastLlmSetupProvider: 'underscore_last_llm_setup_provider',
  /** Pro mode the user picked before OAuth; survives popup close during sign-in. */
  pendingAuthMode: 'underscore_pending_auth_mode',
} as const;

/** Views restored when the popup reopens after Chrome closes it. */
export const PERSISTED_POPUP_VIEWS = [
  'COLLECTIONS',
  'DOMAIN_DETAILS',
  'SUB_DOMAIN',
  'SETTINGS',
  'DASHBOARD',
  'MODE_SELECTION',
] as const;

/** Transient views — never persisted or restored (auth gates, loaders). */
export const TRANSIENT_POPUP_VIEWS = ['AUTH', 'LOADING', 'WELCOME'] as const;

export type PersistedPopupView = (typeof PERSISTED_POPUP_VIEWS)[number];

export function isPersistedPopupView(view: string): view is PersistedPopupView {
  return (PERSISTED_POPUP_VIEWS as readonly string[]).includes(view);
}

export interface PopupNavigationSnapshot {
  lastView?: string;
  lastDomain?: string;
  lastSection?: string;
  lastLlmSetupProvider?: ProviderName;
  pendingAuthMode?: string;
}

export async function loadPopupNavigationSnapshot(): Promise<PopupNavigationSnapshot> {
  const data = await browser.storage.local.get([
    POPUP_NAV_STORAGE_KEYS.lastView,
    POPUP_NAV_STORAGE_KEYS.lastDomain,
    POPUP_NAV_STORAGE_KEYS.lastSection,
    POPUP_NAV_STORAGE_KEYS.lastLlmSetupProvider,
    POPUP_NAV_STORAGE_KEYS.pendingAuthMode,
  ]);
  return {
    lastView: data[POPUP_NAV_STORAGE_KEYS.lastView] as string | undefined,
    lastDomain: data[POPUP_NAV_STORAGE_KEYS.lastDomain] as string | undefined,
    lastSection: data[POPUP_NAV_STORAGE_KEYS.lastSection] as string | undefined,
    lastLlmSetupProvider: data[POPUP_NAV_STORAGE_KEYS.lastLlmSetupProvider] as ProviderName | undefined,
    pendingAuthMode: data[POPUP_NAV_STORAGE_KEYS.pendingAuthMode] as string | undefined,
  };
}

export async function persistPopupView(view: string): Promise<void> {
  if (!isPersistedPopupView(view)) return;
  await browser.storage.local.set({ [POPUP_NAV_STORAGE_KEYS.lastView]: view });
}

export async function persistPopupDomain(domain: string): Promise<void> {
  await browser.storage.local.set({ [POPUP_NAV_STORAGE_KEYS.lastDomain]: domain });
}

export async function persistPopupSection(section: string): Promise<void> {
  await browser.storage.local.set({ [POPUP_NAV_STORAGE_KEYS.lastSection]: section });
}

export async function clearPopupDomainSection(): Promise<void> {
  await browser.storage.local.remove([
    POPUP_NAV_STORAGE_KEYS.lastDomain,
    POPUP_NAV_STORAGE_KEYS.lastSection,
  ]);
}

export async function persistLlmSetupProvider(provider: ProviderName): Promise<void> {
  await browser.storage.local.set({ [POPUP_NAV_STORAGE_KEYS.lastLlmSetupProvider]: provider });
}

export async function persistPendingAuthMode(mode: string): Promise<void> {
  await browser.storage.local.set({ [POPUP_NAV_STORAGE_KEYS.pendingAuthMode]: mode });
}

export async function clearPendingAuthMode(): Promise<void> {
  await browser.storage.local.remove(POPUP_NAV_STORAGE_KEYS.pendingAuthMode);
}
