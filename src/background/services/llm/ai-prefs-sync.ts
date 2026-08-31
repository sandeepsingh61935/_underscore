/**
 * Extension adapter: DeviceAiPrefsStore over LLMKeyStore + chrome.storage.
 * Empty enabledProviders = all enabled (never invent from configured).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { LLMKeyStore } from '@/background/services/llm/llm-key-store';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  emptyAiPreferences,
  LLM_ENABLED_PROVIDERS_KEY,
  LLM_PREFS_UPDATED_AT_KEY,
  normalizeEnabledProviders,
  type AiPreferences,
} from '@/shared/llm/ai-preferences';
import {
  reconcileAiPreferences,
  type DeviceAiPrefsStore,
} from '@/shared/llm/device-ai-prefs-store';
import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
} from '@/shared/llm/in-app-providers';

async function readPrefsClock(): Promise<number> {
  const r = await chrome.storage.local.get(LLM_PREFS_UPDATED_AT_KEY);
  const v = r[LLM_PREFS_UPDATED_AT_KEY];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

async function writePrefsClock(ms: number): Promise<void> {
  await chrome.storage.local.set({ [LLM_PREFS_UPDATED_AT_KEY]: ms });
}

async function readEnabledProviders(): Promise<ProviderName[]> {
  const r = await chrome.storage.local.get(LLM_ENABLED_PROVIDERS_KEY);
  const raw = r[LLM_ENABLED_PROVIDERS_KEY];
  if (!Array.isArray(raw)) return [];
  return normalizeEnabledProviders(raw.filter(isInAppLlmProvider));
}

async function writeEnabledProviders(list: ProviderName[]): Promise<void> {
  if (list.length === 0) {
    await chrome.storage.local.remove(LLM_ENABLED_PROVIDERS_KEY);
    return;
  }
  await chrome.storage.local.set({
    [LLM_ENABLED_PROVIDERS_KEY]: normalizeEnabledProviders(list),
  });
}

function modelStorageKey(provider: ProviderName): string {
  return `llm.${provider}.model`;
}

export async function buildLocalAiPreferences(
  store: LLMKeyStore
): Promise<AiPreferences> {
  const models: AiPreferences['models'] = {};

  for (const id of IN_APP_LLM_PROVIDER_ORDER) {
    const r = await chrome.storage.local.get(modelStorageKey(id));
    const stored = r[modelStorageKey(id)];
    if (typeof stored === 'string' && stored.trim()) {
      models[id] = stored.trim();
    }
  }

  const enabledProviders = await readEnabledProviders();
  const active = await store.getActiveProvider();
  const updatedAtMs = await readPrefsClock();

  return {
    ...emptyAiPreferences(updatedAtMs),
    defaultProvider: active,
    models,
    enabledProviders,
    updatedAtMs,
  };
}

export async function applyAiPreferencesToKeyStore(
  store: LLMKeyStore,
  prefs: AiPreferences
): Promise<void> {
  for (const id of IN_APP_LLM_PROVIDER_ORDER) {
    const model = prefs.models[id];
    if (model?.trim()) {
      await store.setModel(id, model.trim());
    } else {
      await chrome.storage.local.remove(modelStorageKey(id));
    }
  }

  if (prefs.defaultProvider && isInAppLlmProvider(prefs.defaultProvider)) {
    const usable =
      prefs.defaultProvider === 'ollama'
        ? await store.getOllamaVerified()
        : Boolean(await store.get(prefs.defaultProvider));
    if (usable) {
      await store.setActiveProvider(prefs.defaultProvider);
    }
  }

  await writeEnabledProviders(prefs.enabledProviders);
  await writePrefsClock(prefs.updatedAtMs);
}

export function createExtensionDeviceAiPrefsStore(
  store: LLMKeyStore
): DeviceAiPrefsStore {
  return {
    read: () => buildLocalAiPreferences(store),
    apply: (prefs) => applyAiPreferencesToKeyStore(store, prefs),
    writeMeta: async (prefs) => {
      await writePrefsClock(prefs.updatedAtMs);
      await writeEnabledProviders(prefs.enabledProviders);
    },
  };
}

/** Pull + LWW on Models hub open. */
export async function syncExtensionAiPreferences(
  supabase: SupabaseClient,
  userId: string,
  store: LLMKeyStore
): Promise<{
  prefs: AiPreferences;
  source: 'local' | 'remote' | 'empty';
  wroteRemote: boolean;
}> {
  return reconcileAiPreferences(
    supabase,
    userId,
    createExtensionDeviceAiPrefsStore(store)
  );
}

/** After local model/active/clear: bump clock once and push. */
export async function pushExtensionAiPreferences(
  supabase: SupabaseClient,
  userId: string,
  store: LLMKeyStore
): Promise<void> {
  await reconcileAiPreferences(
    supabase,
    userId,
    createExtensionDeviceAiPrefsStore(store),
    { bumpClock: true }
  );
}
