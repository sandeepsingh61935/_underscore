/**
 * Account-synced AI preferences (no secrets).
 *
 * LWW by `updatedAtMs` (G13). Secrets (API keys, Ollama base) stay device-local.
 * Spec: docs/superpowers/specs/2026-08-12-ai-integrations-ia-standard.md
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
} from '@/shared/llm/in-app-providers';

export const AI_PREFERENCES_TABLE = 'ai_preferences';

/** Local storage clock for extension prefs LWW. */
export const LLM_PREFS_UPDATED_AT_KEY = 'llm.prefsUpdatedAtMs';
export const LLM_ENABLED_PROVIDERS_KEY = 'llm.enabledProviders';

export type AiPreferences = {
  defaultProvider: ProviderName | null;
  /** Preferred model id per provider (never API keys). */
  models: Partial<Record<ProviderName, string>>;
  /**
   * Providers the user wants available when keys exist.
   * Empty array means “all in-app providers” (default).
   */
  enabledProviders: ProviderName[];
  /** Client epoch ms; LWW clock (higher wins). */
  updatedAtMs: number;
};

export type AiPreferencesRow = {
  user_id: string;
  default_provider: string | null;
  models: unknown;
  enabled_providers: unknown;
  updated_at: string;
  created_at?: string;
};

export function emptyAiPreferences(nowMs = 0): AiPreferences {
  return {
    defaultProvider: null,
    models: {},
    enabledProviders: [],
    updatedAtMs: nowMs,
  };
}

export function isProviderPreferenceEnabled(
  prefs: Pick<AiPreferences, 'enabledProviders'>,
  provider: ProviderName
): boolean {
  if (prefs.enabledProviders.length === 0) return true;
  return prefs.enabledProviders.includes(provider);
}

function parseModels(raw: unknown): Partial<Record<ProviderName, string>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Partial<Record<ProviderName, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isInAppLlmProvider(k)) continue;
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

function parseEnabled(raw: unknown): ProviderName[] {
  if (!Array.isArray(raw)) return [];
  const out: ProviderName[] = [];
  for (const v of raw) {
    if (isInAppLlmProvider(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Parse DB / API row → domain prefs. Invalid rows → null. */
export function parseAiPreferencesRow(row: unknown): AiPreferences | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const updatedRaw = r['updated_at'];
  const updatedMsRaw = r['updatedAtMs'];
  const updatedAt =
    typeof updatedRaw === 'string'
      ? Date.parse(updatedRaw)
      : typeof updatedMsRaw === 'number'
        ? updatedMsRaw
        : NaN;
  if (!Number.isFinite(updatedAt)) return null;

  const defaultRaw = r['default_provider'] ?? r['defaultProvider'];
  const defaultProvider =
    defaultRaw === null || defaultRaw === undefined
      ? null
      : isInAppLlmProvider(defaultRaw)
        ? defaultRaw
        : null;

  return {
    defaultProvider,
    models: parseModels(r['models']),
    enabledProviders: parseEnabled(r['enabled_providers'] ?? r['enabledProviders']),
    updatedAtMs: updatedAt,
  };
}

export function aiPreferencesToRow(
  userId: string,
  prefs: AiPreferences
): Omit<AiPreferencesRow, 'created_at'> {
  return {
    user_id: userId,
    default_provider: prefs.defaultProvider,
    models: prefs.models,
    enabled_providers: prefs.enabledProviders,
    updated_at: new Date(prefs.updatedAtMs).toISOString(),
  };
}

/** True when local should win over remote (or remote missing). */
export function isLocalNewer(
  local: AiPreferences,
  remote: AiPreferences | null
): boolean {
  if (!remote) return local.updatedAtMs > 0 || hasPrefsContent(local);
  return local.updatedAtMs > remote.updatedAtMs;
}

export function hasPrefsContent(prefs: AiPreferences): boolean {
  if (prefs.defaultProvider) return true;
  if (prefs.enabledProviders.length > 0) return true;
  return Object.keys(prefs.models).length > 0;
}

/** Whole-document LWW: pick higher updatedAtMs; ties keep `preferred`. */
export function pickLwwPrefs(
  a: AiPreferences,
  b: AiPreferences,
  preferred: 'a' | 'b' = 'a'
): AiPreferences {
  if (a.updatedAtMs > b.updatedAtMs) return a;
  if (b.updatedAtMs > a.updatedAtMs) return b;
  return preferred === 'a' ? a : b;
}

/**
 * Merge remote into a “base” local snapshot for apply:
 * remote wins entirely when newer; otherwise keep local.
 */
export function resolveSyncedPrefs(
  local: AiPreferences,
  remote: AiPreferences | null
): { prefs: AiPreferences; source: 'local' | 'remote' | 'empty' } {
  if (!remote) {
    if (!hasPrefsContent(local) && local.updatedAtMs === 0) {
      return { prefs: local, source: 'empty' };
    }
    return { prefs: local, source: 'local' };
  }
  if (isLocalNewer(local, remote)) {
    return { prefs: local, source: 'local' };
  }
  return { prefs: remote, source: 'remote' };
}

/** Normalize enabled list: only known providers, preserve order of catalog. */
export function normalizeEnabledProviders(list: readonly ProviderName[]): ProviderName[] {
  const set = new Set(list.filter(isInAppLlmProvider));
  return IN_APP_LLM_PROVIDER_ORDER.filter((p) => set.has(p));
}

/** Bump LWW clock for a local edit. */
export function touchPrefs(
  prefs: AiPreferences,
  nowMs: number = Date.now()
): AiPreferences {
  return { ...prefs, updatedAtMs: Math.max(nowMs, prefs.updatedAtMs + 1) };
}
