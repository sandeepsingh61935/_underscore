import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { buildWebSupabaseAuthOptions } from './web-supabase-auth-options';

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

  let { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    // Do not crash the entire SPA in dev when env is missing; surface a
    // clear warning and create a placeholder client so the app can still
    // render (auth calls will fail with a network error until env is set).
    console.warn(
      '[supabase-web] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — web auth will fail. Copy .env.production to .env.development or set env vars (see .env.production.example).',
    );
    url = url || 'https://placeholder.supabase.co';
    anonKey = anonKey || 'placeholder-anon-key';
  }

  webClient = createClient(url, anonKey, {
    auth: buildWebSupabaseAuthOptions(url),
  });

  return webClient;
}

/** Test-only reset. */
export function resetWebSupabaseClientForTests(): void {
  webClient = null;
}
