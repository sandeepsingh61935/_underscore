/** Auth + billing only. Mode strings are not commercial. */

/**
 * Early-access free window: signed-in users get Integrations (MCP) without paid.
 * Flip to false when paid SKU turns on (single ops switch).
 * PRD: docs/superpowers/specs/2026-08-14-free-window-integrations-only-prd.md
 */
export const COMMERCIAL_FREE_WINDOW_ENABLED = true;

export function isCommercialFreeWindow(): boolean {
  return COMMERCIAL_FREE_WINDOW_ENABLED;
}

export type CommercialAuth = {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  /** When true, MCP stays locked even during free window (billing past due). */
  isPastDue?: boolean;
};

export type CommercialGateResult =
  | { allowed: true; reason?: undefined }
  | { allowed: false; reason: 'AUTH_REQUIRED' | 'PAID_REQUIRED' };

export type CommercialGateOptions = {
  /** Override free-window flag (tests). Default: isCommercialFreeWindow(). */
  freeWindow?: boolean;
};

export function isCommercialUnlocked(auth: CommercialAuth): boolean {
  return auth.isAuthenticated && auth.isPaidActive;
}

export function commercialGate(auth: CommercialAuth): CommercialGateResult {
  if (!auth.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }
  if (!auth.isPaidActive) {
    return { allowed: false, reason: 'PAID_REQUIRED' };
  }
  return { allowed: true };
}

/**
 * Integrations (MCP): auth required; paid required unless free window is on.
 * Guests never get MCP (cloud library required).
 */
export function canUseMcp(
  auth: CommercialAuth,
  opts?: CommercialGateOptions,
): CommercialGateResult {
  if (!auth.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }
  if (auth.isPastDue) {
    return { allowed: false, reason: 'PAID_REQUIRED' };
  }
  const freeWindow = opts?.freeWindow ?? isCommercialFreeWindow();
  if (freeWindow || auth.isPaidActive) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'PAID_REQUIRED' };
}

/**
 * In-app Models/providers product is retired (Integrations-only).
 * Always denied — free window does not re-open BYOK setup.
 */
export function canConfigureAiProviders(auth: CommercialAuth): CommercialGateResult {
  if (!auth.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }
  return { allowed: false, reason: 'PAID_REQUIRED' };
}
