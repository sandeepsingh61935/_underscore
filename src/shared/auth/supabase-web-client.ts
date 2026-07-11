import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let webClient: SupabaseClient | null = null;

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

/** Shared Supabase client for the web SPA (singleton, persisted session). */
export function getWebSupabaseClient(): SupabaseClient {
  if (webClient) {
    return webClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for web auth');
  }

  webClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return webClient;
}

/** Test-only reset. */
export function resetWebSupabaseClientForTests(): void {
  webClient = null;
}
