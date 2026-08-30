/**
 * Web SPA Supabase auth option builders (pure — easy to unit test).
 * Keeps Google OAuth persistence settings explicit and stable.
 */

export interface WebSupabaseAuthOptions {
  autoRefreshToken: true;
  persistSession: true;
  detectSessionInUrl: true;
  flowType: 'pkce';
  storageKey: string;
}

/** Match Supabase default key shape so existing localStorage sessions keep working. */
export function resolveWebAuthStorageKey(supabaseUrl: string): string {
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split('.')[0] || 'underscore';
    return `sb-${ref}-auth-token`;
  } catch {
    return 'sb-underscore-auth-token';
  }
}

/** Canonical auth options for the web SPA client (durable session + PKCE OAuth). */
export function buildWebSupabaseAuthOptions(supabaseUrl: string): WebSupabaseAuthOptions {
  return {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: resolveWebAuthStorageKey(supabaseUrl),
  };
}
