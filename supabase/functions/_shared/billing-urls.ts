/**
 * Billing redirect / CORS origin allowlisting for Edge.
 * Keep in sync with src/shared/billing/allowed-origins.ts (unit-tested there).
 */

export function parseBillingAllowedOrigins(
  raw: string | undefined | null
): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        const u = new URL(origin.includes('://') ? origin : `https://${origin}`);
        return u.origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

export function isAllowedBillingRedirectUrl(
  url: string,
  allowedOrigins: string[]
): boolean {
  if (!allowedOrigins.length) return false;
  if (!url || typeof url !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  if (parsed.protocol === 'http:') {
    const host = parsed.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return false;
    }
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  return allowedOrigins.includes(parsed.origin);
}

export function defaultBillingSuccessUrl(
  allowedOrigins: string[],
  billingQuery: 'success' | 'cancel' = 'success'
): string | null {
  const first = allowedOrigins[0];
  if (!first) return null;
  return `${first}/settings?billing=${billingQuery}`;
}

export type ResolveRedirectResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function resolveBillingRedirectUrl(
  provided: string | undefined | null,
  allowedOrigins: string[],
  billingQuery: 'success' | 'cancel'
): ResolveRedirectResult {
  if (!allowedOrigins.length) {
    return {
      ok: false,
      error: 'Billing redirect allowlist is not configured',
    };
  }

  if (provided == null || provided === '') {
    const def = defaultBillingSuccessUrl(allowedOrigins, billingQuery);
    if (!def) {
      return { ok: false, error: 'Billing redirect allowlist is not configured' };
    }
    return { ok: true, url: def };
  }

  if (!isAllowedBillingRedirectUrl(provided, allowedOrigins)) {
    return { ok: false, error: 'Invalid successUrl' };
  }

  return { ok: true, url: provided };
}

export function resolveBillingReturnUrl(
  provided: string | undefined | null,
  allowedOrigins: string[]
): ResolveRedirectResult {
  if (provided == null || provided === '') {
    return { ok: true, url: '' };
  }
  if (!allowedOrigins.length) {
    return {
      ok: false,
      error: 'Billing redirect allowlist is not configured',
    };
  }
  if (!isAllowedBillingRedirectUrl(provided, allowedOrigins)) {
    return { ok: false, error: 'Invalid cancelUrl' };
  }
  return { ok: true, url: provided };
}

/** Pinned extension IDs (Origin chrome-extension://id) — keep in sync with wxt key. */
const BILLING_ALLOWED_EXTENSION_IDS = [
  'hecejpjekcgpifnemddfmkjmphmgljlm',
];

/** CORS / request Origin gate for billing edge. */
export function isAllowedBillingCorsOrigin(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;

  if (origin.startsWith('chrome-extension://')) {
    try {
      const id = new URL(origin).hostname;
      return BILLING_ALLOWED_EXTENSION_IDS.includes(id);
    } catch {
      return false;
    }
  }

  if (!allowedOrigins.length) return false;
  try {
    return allowedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

/** No Origin → allow; else must pass isAllowedBillingCorsOrigin. */
export function isBillingRequestOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return true;
  return isAllowedBillingCorsOrigin(origin, allowedOrigins);
}
