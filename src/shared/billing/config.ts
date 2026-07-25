/** App origin used for Polar success/cancel redirects. */

export function getBillingAppOrigin(): string {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env;
    const fromEnv = env?.['VITE_APP_ORIGIN'] ?? env?.['VITE_BILLING_APP_ORIGIN'];
    if (fromEnv) return fromEnv.replace(/\/$/, '');
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Prefer real web origin when running in the SPA
    if (!window.location.origin.startsWith('chrome-extension:')) {
      return window.location.origin;
    }
  }
  return 'https://underscore-web.pages.dev';
}

export function getSupabaseUrl(): string {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env;
    const url = env?.['VITE_SUPABASE_URL'];
    if (url) return url.replace(/\/$/, '');
  } catch {
    // ignore
  }
  throw new Error('VITE_SUPABASE_URL is required for billing');
}

export function getSupabaseAnonKey(): string {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env;
    return env?.['VITE_SUPABASE_ANON_KEY'] ?? '';
  } catch {
    return '';
  }
}
