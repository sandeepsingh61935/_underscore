/**
 * Request optional host permissions at the moment of use (user gesture preferred).
 * Keeps install prompts short: no bulk API/localhost grants until needed.
 */
import { browser } from 'wxt/browser';

export const ORIGIN_SUPABASE = 'https://cuzwaukxagefyvtxbqmi.supabase.co/*';

export const ORIGIN_POLAR = [
  'https://polar.sh/*',
  'https://buy.polar.sh/*',
] as const;

/** Dev/sandbox Polar only — not shown unless billing hits sandbox. */
export const ORIGIN_POLAR_SANDBOX = 'https://sandbox.polar.sh/*';

export const ORIGIN_LLM: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/*',
  anthropic: 'https://api.anthropic.com/*',
  openai: 'https://api.openai.com/*',
  xai: 'https://api.x.ai/*',
  openrouter: 'https://openrouter.ai/*',
};

export const ORIGIN_OLLAMA = [
  'http://localhost:11434/*',
  'http://127.0.0.1:11434/*',
] as const;

export const ORIGIN_MCP_BRIDGE = [
  'http://127.0.0.1:17342/*',
  'ws://127.0.0.1:17342/*',
] as const;

/**
 * Ensure the extension may access the given origin patterns.
 * Returns false if the user denies the browser permission prompt.
 */
export async function ensureOrigins(origins: readonly string[]): Promise<boolean> {
  const list = [...new Set(origins.filter(Boolean))];
  if (list.length === 0) return true;

  try {
    const perms = browser.permissions;
    if (!perms?.contains || !perms.request) {
      // Environment without permissions API (tests) — allow.
      return true;
    }
    const already = await perms.contains({ origins: list });
    if (already) return true;
    return await perms.request({ origins: list });
  } catch {
    return false;
  }
}

export async function ensureSupabaseOrigin(): Promise<boolean> {
  return ensureOrigins([ORIGIN_SUPABASE]);
}

export async function hasSupabaseOrigin(): Promise<boolean> {
  try {
    const perms = browser.permissions;
    if (!perms?.contains) return true;
    return await perms.contains({ origins: [ORIGIN_SUPABASE] });
  } catch {
    return false;
  }
}

export async function ensureLlmOrigin(provider: string): Promise<boolean> {
  const origin = ORIGIN_LLM[provider];
  if (!origin) return true;
  return ensureOrigins([origin]);
}

export async function ensureOllamaOrigins(): Promise<boolean> {
  return ensureOrigins([...ORIGIN_OLLAMA]);
}

export async function ensureMcpBridgeOrigins(): Promise<boolean> {
  return ensureOrigins([...ORIGIN_MCP_BRIDGE]);
}
