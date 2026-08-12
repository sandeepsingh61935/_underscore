/**
 * Supabase port for account AI preferences (RLS-owned rows).
 * No secrets — models / default / enablement only.
 *
 * LWW: fetch once in sync; conditional write only when local is newer.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AI_PREFERENCES_TABLE,
  aiPreferencesToRow,
  emptyAiPreferences,
  hasPrefsContent,
  isLocalNewer,
  parseAiPreferencesRow,
  resolveSyncedPrefs,
  type AiPreferences,
} from '@/shared/llm/ai-preferences';

export type AiPreferencesSyncResult = {
  prefs: AiPreferences;
  /** Which side won LWW after merge. */
  source: 'local' | 'remote' | 'empty';
  /** True if we wrote local to the server. */
  wroteRemote: boolean;
};

export async function fetchAiPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiPreferences | null> {
  const { data, error } = await supabase
    .from(AI_PREFERENCES_TABLE)
    .select('user_id, default_provider, models, enabled_providers, updated_at, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load AI preferences');
  }
  if (!data) return null;
  return parseAiPreferencesRow(data);
}

/**
 * Write local prefs when newer than `knownRemote` (from a prior fetch in the same sync).
 * Returns remote if a concurrent writer advanced the row.
 */
export async function putAiPreferencesLww(
  supabase: SupabaseClient,
  userId: string,
  prefs: AiPreferences,
  knownRemote: AiPreferences | null,
): Promise<AiPreferences> {
  if (prefs.updatedAtMs <= 0) {
    throw new Error('AI preferences require a positive updatedAtMs');
  }

  if (knownRemote && !isLocalNewer(prefs, knownRemote)) {
    return knownRemote;
  }

  const row = aiPreferencesToRow(userId, prefs);

  if (!knownRemote) {
    const { error } = await supabase.from(AI_PREFERENCES_TABLE).upsert(row, {
      onConflict: 'user_id',
    });
    if (error) {
      const again = await fetchAiPreferences(supabase, userId);
      if (again && !isLocalNewer(prefs, again)) return again;
      throw new Error(error.message || 'Failed to upsert AI preferences');
    }
    return prefs;
  }

  const { data, error } = await supabase
    .from(AI_PREFERENCES_TABLE)
    .update({
      default_provider: row.default_provider,
      models: row.models,
      enabled_providers: row.enabled_providers,
      updated_at: row.updated_at,
    })
    .eq('user_id', userId)
    .lt('updated_at', row.updated_at)
    .select('user_id, default_provider, models, enabled_providers, updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update AI preferences');
  }

  if (data) {
    return parseAiPreferencesRow(data) ?? prefs;
  }

  const latest = await fetchAiPreferences(supabase, userId);
  return latest ?? prefs;
}

/**
 * Pull remote, LWW with local, push when local wins and has content.
 * Callers apply returned prefs to device stores (never overwrites keys).
 */
export async function syncAiPreferences(
  supabase: SupabaseClient,
  userId: string,
  local: AiPreferences,
): Promise<AiPreferencesSyncResult> {
  const remote = await fetchAiPreferences(supabase, userId);
  const resolved = resolveSyncedPrefs(local, remote);

  if (resolved.source === 'empty') {
    return { prefs: emptyAiPreferences(), source: 'empty', wroteRemote: false };
  }

  if (resolved.source === 'local' && hasPrefsContent(resolved.prefs)) {
    const toWrite =
      resolved.prefs.updatedAtMs > 0
        ? resolved.prefs
        : { ...resolved.prefs, updatedAtMs: Date.now() };
    const written = await putAiPreferencesLww(supabase, userId, toWrite, remote);
    if (written.updatedAtMs > toWrite.updatedAtMs) {
      return { prefs: written, source: 'remote', wroteRemote: false };
    }
    return { prefs: written, source: 'local', wroteRemote: true };
  }

  return {
    prefs: resolved.prefs,
    source: resolved.source,
    wroteRemote: false,
  };
}
