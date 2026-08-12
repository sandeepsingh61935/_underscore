/**
 * CORS allowlist for LLM pass-through (ADR-027 review).
 */

import { parseBillingAllowedOrigins } from '@/shared/billing/allowed-origins';

/** Dev + production SPA defaults when env is unset. */
export const DEFAULT_LLM_PROXY_ORIGINS: readonly string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'https://underscore-web.pages.dev',
];

/**
 * Resolve allowlisted origins from env (comma-separated) or defaults.
 * Accepts LLM_PROXY_ALLOWED_ORIGINS or BILLING_ALLOWED_ORIGINS.
 */
export function resolveLlmProxyAllowedOrigins(env: {
  LLM_PROXY_ALLOWED_ORIGINS?: string;
  BILLING_ALLOWED_ORIGINS?: string;
}): string[] {
  const fromLlm = parseBillingAllowedOrigins(env.LLM_PROXY_ALLOWED_ORIGINS);
  if (fromLlm.length) return fromLlm;
  const fromBilling = parseBillingAllowedOrigins(env.BILLING_ALLOWED_ORIGINS);
  if (fromBilling.length) return fromBilling;
  return [...DEFAULT_LLM_PROXY_ORIGINS];
}

/** Exact origin match against allowlist. */
export function isAllowedLlmProxyOrigin(
  origin: string | null,
  allowed: readonly string[],
): boolean {
  if (!origin || origin === 'null') return false;
  return allowed.includes(origin);
}

/**
 * CORS headers for a request. Reflects Origin only when allowlisted;
 * omits ACAO when origin is missing/disallowed (same-origin browser still works).
 */
export function llmProxyCorsHeaders(
  req: Request,
  allowed: readonly string[],
): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'access-control-allow-headers':
      'authorization, content-type, x-llm-api-key',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  };
  if (origin && isAllowedLlmProxyOrigin(origin, allowed)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}
