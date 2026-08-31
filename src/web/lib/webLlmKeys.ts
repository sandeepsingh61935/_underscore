/**
 * Web-local LLM provider secrets + default preference.
 *
 * Secrets: device store only (industry BYOK: keys do not sync). Plaintext
 * localStorage is intentional v1 debt until a vault ADR — never log these.
 * Prefs (default / models / enablement): also mirrored to account via
 * `syncWebAiPreferences` when signed in (LWW).
 *
 * Key: underscore.web.llm
 */

import { PROVIDER_META } from '@/features/ai/constants/provider-setup';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import type { AiPreferences } from '@/shared/llm/ai-preferences';
import { normalizeEnabledProviders } from '@/shared/llm/ai-preferences';
import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
} from '@/shared/llm/in-app-providers';
import { getDefaultModelId } from '@/shared/llm/provider-models';

export const WEB_LLM_STORAGE_KEY = 'underscore.web.llm';

export type WebProviderConfig = {
  apiKey?: string;
  apiBase?: string;
  model?: string;
  /** Set only after a successful health check. */
  checkedAt?: number;
};

export type WebLlmState = {
  providers: Partial<Record<ProviderName, WebProviderConfig>>;
  defaultProvider?: ProviderName;
  /** LWW clock for account-synced prefs (not secrets). */
  prefsUpdatedAtMs?: number;
  /**
   * Account enablement allow-list. Empty/undefined = all providers enabled
   * when keys exist.
   */
  enabledProviders?: ProviderName[];
};

export type WebLlmAction =
  | { type: 'upsert'; provider: ProviderName; patch: WebProviderConfig }
  | { type: 'clear'; provider: ProviderName }
  | { type: 'setDefault'; provider: ProviderName | undefined }
  | { type: 'applyPrefs'; prefs: AiPreferences };

function emptyState(): WebLlmState {
  return { providers: {} };
}

function parseConfig(raw: unknown): WebProviderConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const cfg = raw as Record<string, unknown>;
  return {
    apiKey: typeof cfg['apiKey'] === 'string' ? cfg['apiKey'] : undefined,
    apiBase: typeof cfg['apiBase'] === 'string' ? cfg['apiBase'] : undefined,
    model: typeof cfg['model'] === 'string' ? cfg['model'] : undefined,
    checkedAt: typeof cfg['checkedAt'] === 'number' ? cfg['checkedAt'] : undefined,
  };
}

export function readWebLlmState(): WebLlmState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(WEB_LLM_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<WebLlmState>;
    const providers: WebLlmState['providers'] = {};
    if (parsed.providers && typeof parsed.providers === 'object') {
      for (const [k, v] of Object.entries(parsed.providers)) {
        if (!isInAppLlmProvider(k)) continue;
        const cfg = parseConfig(v);
        if (cfg) providers[k] = cfg;
      }
    }
    const defaultProvider =
      parsed.defaultProvider && isInAppLlmProvider(parsed.defaultProvider)
        ? parsed.defaultProvider
        : undefined;
    const prefsUpdatedAtMs =
      typeof parsed.prefsUpdatedAtMs === 'number' &&
      Number.isFinite(parsed.prefsUpdatedAtMs)
        ? parsed.prefsUpdatedAtMs
        : undefined;
    let enabledProviders: ProviderName[] | undefined;
    if (Array.isArray(parsed.enabledProviders)) {
      enabledProviders = normalizeEnabledProviders(
        parsed.enabledProviders.filter(isInAppLlmProvider)
      );
    }
    return { providers, defaultProvider, prefsUpdatedAtMs, enabledProviders };
  } catch {
    return emptyState();
  }
}

export function writeWebLlmState(next: WebLlmState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WEB_LLM_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
}

/** Configured = successful check (checkedAt) and required credentials present. */
export function isProviderConfigured(
  state: WebLlmState,
  provider: ProviderName
): boolean {
  const cfg = state.providers[provider];
  if (!cfg?.checkedAt) return false;
  if (provider === 'ollama') return true;
  return Boolean(cfg.apiKey?.trim());
}

export function getProviderModel(state: WebLlmState, provider: ProviderName): string {
  return state.providers[provider]?.model?.trim() || getDefaultModelId(provider);
}

/** Active provider for Ask (default if configured, else first in canonical order). */
export function resolveActiveProvider(state: WebLlmState): ProviderName | null {
  if (state.defaultProvider && isProviderConfigured(state, state.defaultProvider)) {
    return state.defaultProvider;
  }
  for (const id of IN_APP_LLM_PROVIDER_ORDER) {
    if (isProviderConfigured(state, id)) return id;
  }
  return null;
}

/** Same active resolution as Ask — never “None” when a configured provider exists. */
export function formatDefaultModelLabel(state: WebLlmState): string {
  const p = resolveActiveProvider(state);
  if (!p) return 'None';
  return `${PROVIDER_META[p].label} · ${getProviderModel(state, p)}`;
}

export function reduceWebLlmState(
  state: WebLlmState,
  action: WebLlmAction,
  nowMs: number = Date.now()
): WebLlmState {
  switch (action.type) {
    case 'upsert': {
      const merged: WebProviderConfig = {
        ...state.providers[action.provider],
        ...action.patch,
      };
      const providers = { ...state.providers, [action.provider]: merged };
      let defaultProvider = state.defaultProvider;
      const nextProbe = { providers, defaultProvider };
      if (!defaultProvider && isProviderConfigured(nextProbe, action.provider)) {
        defaultProvider = action.provider;
      }
      // Enablement is explicit only — empty means all; never invent allow-lists.
      return {
        providers,
        defaultProvider,
        enabledProviders: state.enabledProviders,
        prefsUpdatedAtMs: nowMs,
      };
    }
    case 'clear': {
      const providers = { ...state.providers };
      delete providers[action.provider];
      let defaultProvider = state.defaultProvider;
      if (defaultProvider === action.provider) {
        defaultProvider = undefined;
        for (const id of Object.keys(providers) as ProviderName[]) {
          if (isProviderConfigured({ providers, defaultProvider }, id)) {
            defaultProvider = id;
            break;
          }
        }
      }
      // Only drop from allow-list when one was set explicitly.
      const enabledProviders = state.enabledProviders?.filter(
        (p) => p !== action.provider
      );
      return {
        providers,
        defaultProvider,
        enabledProviders:
          enabledProviders && enabledProviders.length > 0 ? enabledProviders : undefined,
        prefsUpdatedAtMs: nowMs,
      };
    }
    case 'setDefault':
      return {
        ...state,
        defaultProvider: action.provider,
        prefsUpdatedAtMs: nowMs,
      };
    case 'applyPrefs': {
      // Whole-doc LWW for prefs fields: models/default/enablement from remote.
      // Secrets (apiKey / apiBase / checkedAt) stay device-local.
      const providers: WebLlmState['providers'] = {};
      for (const id of IN_APP_LLM_PROVIDER_ORDER) {
        const secret = state.providers[id];
        const model = action.prefs.models[id];
        if (!secret && !model) continue;
        const next: WebProviderConfig = {};
        if (secret?.apiKey) next.apiKey = secret.apiKey;
        if (secret?.apiBase) next.apiBase = secret.apiBase;
        if (secret?.checkedAt != null) next.checkedAt = secret.checkedAt;
        if (model) next.model = model;
        if (Object.keys(next).length > 0) providers[id] = next;
      }
      return {
        providers,
        defaultProvider: action.prefs.defaultProvider ?? undefined,
        enabledProviders:
          action.prefs.enabledProviders.length > 0
            ? normalizeEnabledProviders(action.prefs.enabledProviders)
            : undefined,
        prefsUpdatedAtMs: action.prefs.updatedAtMs,
      };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Build account prefs snapshot from web-local state (no secrets).
 * Empty enabledProviders = all enabled (never invent from configured).
 */
export function extractAiPreferences(state: WebLlmState): AiPreferences {
  const models: AiPreferences['models'] = {};
  for (const id of IN_APP_LLM_PROVIDER_ORDER) {
    const m = state.providers[id]?.model?.trim();
    if (m) models[id] = m;
  }
  const enabledProviders =
    state.enabledProviders && state.enabledProviders.length > 0
      ? normalizeEnabledProviders(state.enabledProviders)
      : [];

  return {
    defaultProvider: state.defaultProvider ?? null,
    models,
    enabledProviders,
    updatedAtMs: state.prefsUpdatedAtMs ?? 0,
  };
}

/** Fired after local web LLM state commits (Ask / Settings listen for refresh). */
export const WEB_LLM_CHANGED_EVENT = 'underscore:web-llm-changed';

export function commitWebLlmAction(action: WebLlmAction): WebLlmState {
  const next = reduceWebLlmState(readWebLlmState(), action);
  writeWebLlmState(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WEB_LLM_CHANGED_EVENT));
  }
  return next;
}

/** @deprecated prefer commitWebLlmAction — kept for call-site clarity aliases */
export function upsertProviderConfig(
  provider: ProviderName,
  patch: WebProviderConfig
): WebLlmState {
  return commitWebLlmAction({ type: 'upsert', provider, patch });
}

export function clearProviderConfig(provider: ProviderName): WebLlmState {
  return commitWebLlmAction({ type: 'clear', provider });
}

export function setDefaultProvider(provider: ProviderName | undefined): WebLlmState {
  return commitWebLlmAction({ type: 'setDefault', provider });
}
