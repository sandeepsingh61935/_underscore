/** Auth + billing only. Mode strings are not commercial. */
export type CommercialAuth = {
  isAuthenticated: boolean;
  isPaidActive: boolean;
};

export type CommercialGateResult =
  | { allowed: true; reason?: undefined }
  | { allowed: false; reason: 'AUTH_REQUIRED' | 'PAID_REQUIRED' };

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

export function canUseMcp(auth: CommercialAuth): CommercialGateResult {
  return commercialGate(auth);
}

export function canConfigureAiProviders(auth: CommercialAuth): CommercialGateResult {
  return commercialGate(auth);
}
