/**
 * Billing redirect / CORS origin allowlisting (pure).
 * Used by clients for docs alignment; Edge copies same rules in _shared/billing-urls.ts.
 */

export function parseBillingAllowedOrigins(raw: string | undefined | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        // Normalize via URL so trailing slashes / casing of scheme are consistent
        const u = new URL(origin.includes('://') ? origin : `https://${origin}`);
        return u.origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

/**
 * True when url's origin is exactly one of allowedOrigins.
 * Rejects credentials, non-http(s), and empty allowlist.
 */
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

  // Dev http only for localhost / 127.0.0.1 (still must be in allowlist)
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
  { ok: true; url: string } | { ok: false; error: string };

/**
 * Resolve a client-provided redirect URL or default under the first allowlisted origin.
 */
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

/**
 * Pinned extension IDs allowed to call billing edge (Origin: chrome-extension://…).
 * Keep in sync with wxt.config permanent extension id.
 */
export const BILLING_ALLOWED_EXTENSION_IDS = [
  'hecejpjekcgpifnemddfmkjmphmgljlm',
] as const;

/**
 * Whether a request Origin may call billing-checkout/portal.
 * - Allowlisted https/http web origins (BILLING_ALLOWED_ORIGINS)
 * - chrome-extension:// with pinned extension id
 * - missing Origin (server-to-server) is handled by caller (treat as allowed)
 */
export function isAllowedBillingCorsOrigin(
  origin: string | null | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;

  // Extension SW fetch often sends Origin: chrome-extension://<id>
  if (origin.startsWith('chrome-extension://')) {
    try {
      const id = new URL(origin).hostname;
      return (BILLING_ALLOWED_EXTENSION_IDS as readonly string[]).includes(id);
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

/**
 * Gate for checkout/portal POST: no Origin → allow (curl/tests);
 * else must pass isAllowedBillingCorsOrigin.
 */
export function isBillingRequestOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) return true;
  return isAllowedBillingCorsOrigin(origin, allowedOrigins);
}

/** For cancel/return_url error copy when field is cancel-specific */
export function resolveBillingReturnUrl(
  provided: string | undefined | null,
  allowedOrigins: string[]
): ResolveRedirectResult {
  if (provided == null || provided === '') {
    // Optional field: no return URL is OK
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
