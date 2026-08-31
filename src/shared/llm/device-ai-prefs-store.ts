/**
 * Device port + single reconcile path for account AI prefs (LWW).
 *
 * Web and extension only implement read / apply / writeMeta.
 * Secrets never cross this boundary.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  hasPrefsContent,
  touchPrefs,
  type AiPreferences,
} from '@/shared/llm/ai-preferences';
import {
  syncAiPreferences,
  type AiPreferencesSyncResult,
} from '@/shared/llm/ai-preferences-client';

/**
 * Per-client storage for synced prefs fields only.
 * Implementations must not read/write API keys or Ollama base URLs into the cloud snapshot.
 */
export interface DeviceAiPrefsStore {
  /** Snapshot of account prefs on this device (no secrets). */
  read(): Promise<AiPreferences>;
  /**
   * Remote won LWW: whole-doc apply for models / default / enablement.
   * Must preserve device secrets.
   */
  apply(prefs: AiPreferences): Promise<void>;
  /**
   * Local won (or pre-push clock bump): persist clock + enablement mirror only.
   * Prefer this over full apply when local content is already on disk.
   */
  writeMeta(prefs: AiPreferences): Promise<void>;
}

export type ReconcileAiPreferencesOptions = {
  /**
   * Prefer this snapshot over `device.read()` (e.g. web just committed in-memory state).
   */
  local?: AiPreferences;
  /**
   * Bump LWW clock before sync (extension after SET_API_KEY; not web when reduce already stamped).
   */
  bumpClock?: boolean;
};

/**
 * One path for pull and push:
 * 1. read (or use local override)
 * 2. optional clock bump + writeMeta
 * 3. network LWW via syncAiPreferences
 * 4. apply if remote wins, else writeMeta if local side advanced
 */
export async function reconcileAiPreferences(
  supabase: SupabaseClient,
  userId: string,
  device: DeviceAiPrefsStore,
  opts: ReconcileAiPreferencesOptions = {}
): Promise<AiPreferencesSyncResult> {
  let local = opts.local ?? (await device.read());

  const needsBump =
    opts.bumpClock === true || (local.updatedAtMs <= 0 && hasPrefsContent(local));

  if (needsBump) {
    local = touchPrefs(local);
    await device.writeMeta(local);
  }

  const result = await syncAiPreferences(supabase, userId, local);

  if (result.source === 'remote') {
    await device.apply(result.prefs);
    return result;
  }

  if (result.wroteRemote || result.source === 'local') {
    await device.writeMeta(result.prefs);
  }

  return result;
}
