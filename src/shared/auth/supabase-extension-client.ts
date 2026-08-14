/**
 * Supabase SDK client for extension pages (popup) sharing chrome.storage session
 * with the background service worker (same storage keys / chrome.storage.local).
 */

import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js';

let extensionClient: SupabaseClient | null = null;

/** chrome.storage.local adapter — same approach as background SupabaseStorageAdapter. */
class ChromeLocalAuthStorage implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as string) || null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }
}

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

/** Singleton Supabase client for extension UI (popup). */
export function getExtensionSupabaseClient(): SupabaseClient {
  if (extensionClient) {
    return extensionClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for extension chat',
    );
  }

  extensionClient = createClient(url, anonKey, {
    auth: {
      storage: new ChromeLocalAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return extensionClient;
}

/** Test-only reset. */
export function resetExtensionSupabaseClientForTests(): void {
  extensionClient = null;
}
