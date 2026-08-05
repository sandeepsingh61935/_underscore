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
  const isPaidActive = !isGuest && input.isPaidActive;

  if (isGuest) {
    return {
      isGuest: true,
      isPastDue: false,
      isPaidActive: false,
      planLabel: 'Guest',
      flags: { sync: false, export: false, ai: false, mcp: false },
    };
  }

  if (isPastDue) {
    return {
      isGuest: false,
      isPastDue: true,
      isPaidActive: false,
      planLabel: 'Past due',
      flags: { sync: true, export: true, ai: false, mcp: false },
    };
  }

  if (isPaidActive) {
    return {
      isGuest: false,
      isPastDue: false,
      isPaidActive: true,
      planLabel: 'Paid',
      flags: { sync: true, export: true, ai: true, mcp: true },
    };
  }

  return {
    isGuest: false,
    isPastDue: false,
    isPaidActive: false,
    planLabel: 'Free',
    flags: { sync: true, export: true, ai: false, mcp: false },
  };
}
