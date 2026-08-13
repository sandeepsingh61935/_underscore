import { describe, expect, it } from 'vitest';

import {
  canConfigureAiProviders,
  canUseMcp,
  isCommercialUnlocked,
} from '@/shared/entitlement/commercial';

describe('isCommercialUnlocked', () => {
  it('is false for guests even if paid is true', () => {
    expect(isCommercialUnlocked({ isAuthenticated: false, isPaidActive: true })).toBe(false);
  });

  it('is false for signed-in unpaid', () => {
    expect(isCommercialUnlocked({ isAuthenticated: true, isPaidActive: false })).toBe(false);
  });

  it('is true only when authenticated and paid', () => {
    expect(isCommercialUnlocked({ isAuthenticated: true, isPaidActive: true })).toBe(true);
  });
});

describe('canUseMcp / canConfigureAiProviders', () => {
  it('denies guests with AUTH_REQUIRED', () => {
    expect(canUseMcp({ isAuthenticated: false, isPaidActive: false })).toEqual({
      allowed: false,
      reason: 'AUTH_REQUIRED',
    });
  });

  it('denies signed-in unpaid with PAID_REQUIRED', () => {
    expect(canConfigureAiProviders({ isAuthenticated: true, isPaidActive: false })).toEqual({
      allowed: false,
      reason: 'PAID_REQUIRED',
    });
  });

  it('allows paid signed-in without a mode string', () => {
    expect(canUseMcp({ isAuthenticated: true, isPaidActive: true })).toEqual({ allowed: true });
    expect(canConfigureAiProviders({ isAuthenticated: true, isPaidActive: true })).toEqual({
      allowed: true,
    });
  });
});
