/**
 * Web adapter: DeviceAiPrefsStore over localStorage webLlmKeys.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AiPreferences } from '@/shared/llm/ai-preferences';
import {
  reconcileAiPreferences,
  type DeviceAiPrefsStore,
} from '@/shared/llm/device-ai-prefs-store';
import {
  commitWebLlmAction,
  extractAiPreferences,
  readWebLlmState,
  writeWebLlmState,
  type WebLlmState,
} from '@/web/lib/webLlmKeys';

export type WebAiPrefsSyncResult = {
  state: WebLlmState;
  prefs: AiPreferences;
  source: 'local' | 'remote' | 'empty';
  wroteRemote: boolean;
};

function applyClockToState(state: WebLlmState, prefs: AiPreferences): WebLlmState {
  return {
    ...state,
    prefsUpdatedAtMs: prefs.updatedAtMs,
    enabledProviders:
      prefs.enabledProviders.length > 0 ? prefs.enabledProviders : undefined,
  };
}

/** Web device port — secrets stay in webLlmKeys; prefs fields only cross reconcile. */
export function createWebDeviceAiPrefsStore(): DeviceAiPrefsStore {
  return {
    async read() {
      return extractAiPreferences(readWebLlmState());
    },
    async apply(prefs) {
      commitWebLlmAction({ type: 'applyPrefs', prefs });
    },
    async writeMeta(prefs) {
      writeWebLlmState(applyClockToState(readWebLlmState(), prefs));
    },
  };
}

export async function pullWebAiPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<WebAiPrefsSyncResult> {
  const result = await reconcileAiPreferences(
    supabase,
    userId,
    createWebDeviceAiPrefsStore(),
  );
  return {
    state: readWebLlmState(),
    prefs: result.prefs,
    source: result.source,
    wroteRemote: result.wroteRemote,
  };
}

/**
 * Push already-committed local state (clock from reduce).
 * Passes `local` so we do not re-read a stale disk mid-UI update.
 */
export async function pushWebAiPreferences(
  supabase: SupabaseClient,
  userId: string,
  state: WebLlmState = readWebLlmState(),
): Promise<WebAiPrefsSyncResult> {
  // Ensure disk matches the committed UI state before reconcile meta writes.
  writeWebLlmState(state);
  const local = extractAiPreferences(state);

  const result = await reconcileAiPreferences(
    supabase,
    userId,
    createWebDeviceAiPrefsStore(),
    {
      local,
      // Only bump if reduce forgot a clock; normal saves already stamped.
      bumpClock: local.updatedAtMs <= 0,
    },
  );

  return {
    state: readWebLlmState(),
    prefs: result.prefs,
    source: result.source,
    wroteRemote: result.wroteRemote,
  };
}
