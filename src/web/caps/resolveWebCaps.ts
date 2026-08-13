import { isCommercialUnlocked } from '@/shared/entitlement/commercial';

export type WebCapFlags = {
  sync: boolean;
  export: boolean;
  ai: boolean;
  mcp: boolean;
};

export type WebPlanLabel = 'Guest' | 'Free' | 'Paid' | 'Past due';

export type WebCaps = {
  flags: WebCapFlags;
  planLabel: WebPlanLabel;
  isGuest: boolean;
  isPastDue: boolean;
  isPaidActive: boolean;
};

export function resolveWebCaps(input: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  billingStatus?: string | null;
}): WebCaps {
  const isGuest = !input.isAuthenticated;
  const isPastDue = !isGuest && input.billingStatus === 'past_due';
  const isPaidActive = isCommercialUnlocked({
    isAuthenticated: input.isAuthenticated,
    isPaidActive: input.isPaidActive && !isPastDue,
  });
  const commercial = { ai: isPaidActive, mcp: isPaidActive };

  if (isGuest) {
    return {
      isGuest: true,
      isPastDue: false,
      isPaidActive: false,
      planLabel: 'Guest',
      flags: { sync: false, export: false, ...commercial },
    };
  }

  if (isPastDue) {
    return {
      isGuest: false,
      isPastDue: true,
      isPaidActive: false,
      planLabel: 'Past due',
      flags: { sync: true, export: true, ...commercial },
    };
  }

  if (isPaidActive) {
    return {
      isGuest: false,
      isPastDue: false,
      isPaidActive: true,
      planLabel: 'Paid',
      flags: { sync: true, export: true, ...commercial },
    };
  }

  return {
    isGuest: false,
    isPastDue: false,
    isPaidActive: false,
    planLabel: 'Free',
    flags: { sync: true, export: true, ...commercial },
  };
}
