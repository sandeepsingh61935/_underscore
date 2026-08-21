/**
 * Shared product capability resolution (web + extension popup).
 * Ask/Models (in-app AI) always off. MCP follows paid + free-window rules.
 */
import {
  isCommercialFreeWindow,
  isCommercialUnlocked,
} from '@/shared/entitlement/commercial';

export type ProductCapFlags = {
  sync: boolean;
  export: boolean;
  /** In-app Ask/Models — always false (product retired). */
  ai: boolean;
  /** Integrations (MCP). */
  mcp: boolean;
};

export type ProductPlanLabel = 'Guest' | 'Free' | 'Paid' | 'Past due';

export type ProductCaps = {
  flags: ProductCapFlags;
  planLabel: ProductPlanLabel;
  isGuest: boolean;
  isPastDue: boolean;
  isPaidActive: boolean;
  /** Early-access free window active for this resolution. */
  freeWindow: boolean;
};

/** @deprecated Prefer ProductCapFlags — alias for web migration. */
export type WebCapFlags = ProductCapFlags;
/** @deprecated Prefer ProductPlanLabel */
export type WebPlanLabel = ProductPlanLabel;
/** @deprecated Prefer ProductCaps */
export type WebCaps = ProductCaps;

export function resolveProductCaps(input: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  billingStatus?: string | null;
  /** Test override; default isCommercialFreeWindow(). */
  freeWindow?: boolean;
}): ProductCaps {
  const isGuest = !input.isAuthenticated;
  const isPastDue = !isGuest && input.billingStatus === 'past_due';
  const freeWindow = input.freeWindow ?? isCommercialFreeWindow();
  const isPaidActive = isCommercialUnlocked({
    isAuthenticated: input.isAuthenticated,
    isPaidActive: input.isPaidActive && !isPastDue,
  });

  // Ask/Models product removed — never unlock in-app AI.
  const ai = false;
  // MCP: signed-in, not past due, and (paid OR free window).
  const mcp = !isGuest && !isPastDue && (isPaidActive || freeWindow);

  const flags = { sync: false, export: false, ai, mcp };

  if (isGuest) {
    return {
      isGuest: true,
      isPastDue: false,
      isPaidActive: false,
      planLabel: 'Guest',
      freeWindow,
      flags: { ...flags, sync: false, export: false },
    };
  }

  if (isPastDue) {
    return {
      isGuest: false,
      isPastDue: true,
      isPaidActive: false,
      planLabel: 'Past due',
      freeWindow,
      flags: { ...flags, sync: true, export: true, mcp: false },
    };
  }

  if (isPaidActive) {
    return {
      isGuest: false,
      isPastDue: false,
      isPaidActive: true,
      planLabel: 'Paid',
      freeWindow,
      flags: { ...flags, sync: true, export: true },
    };
  }

  return {
    isGuest: false,
    isPastDue: false,
    isPaidActive: false,
    planLabel: 'Free',
    freeWindow,
    flags: { ...flags, sync: true, export: true },
  };
}

/** @deprecated Prefer resolveProductCaps */
export const resolveWebCaps = resolveProductCaps;
