import { describe, expect, it } from 'vitest';

import {
  canConfigureAiProviders,
  canUseMcp,
  isCommercialFreeWindow,
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

describe('canUseMcp free window', () => {
  it('denies guests with AUTH_REQUIRED even when free window on', () => {
    expect(
      canUseMcp({ isAuthenticated: false, isPaidActive: false }, { freeWindow: true }),
    ).toEqual({
      allowed: false,
      reason: 'AUTH_REQUIRED',
    });
  });

  it('allows signed-in unpaid when free window on', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: false }, { freeWindow: true }),
    ).toEqual({ allowed: true });
  });

  it('denies past_due even when free window on', () => {
    expect(
      canUseMcp(
        { isAuthenticated: true, isPaidActive: false, isPastDue: true },
        { freeWindow: true },
      ),
    ).toEqual({ allowed: false, reason: 'PAID_REQUIRED' });
  });

  it('denies signed-in unpaid when free window off', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: false }, { freeWindow: false }),
    ).toEqual({
      allowed: false,
      reason: 'PAID_REQUIRED',
    });
  });

  it('allows paid signed-in when free window off', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: true }, { freeWindow: false }),
    ).toEqual({ allowed: true });
  });

  it('default freeWindow follows isCommercialFreeWindow()', () => {
    const unpaid = canUseMcp({ isAuthenticated: true, isPaidActive: false });
    if (isCommercialFreeWindow()) {
      expect(unpaid).toEqual({ allowed: true });
    } else {
      expect(unpaid).toEqual({ allowed: false, reason: 'PAID_REQUIRED' });
    }
  });
});

describe('canConfigureAiProviders (product retired)', () => {
  it('denies guests with AUTH_REQUIRED', () => {
    expect(canConfigureAiProviders({ isAuthenticated: false, isPaidActive: false })).toEqual({
      allowed: false,
      reason: 'AUTH_REQUIRED',
    });
  });

  it('denies signed-in unpaid', () => {
    expect(canConfigureAiProviders({ isAuthenticated: true, isPaidActive: false })).toEqual({
      allowed: false,
      reason: 'PAID_REQUIRED',
    });
  });

  it('denies signed-in paid (Models product removed)', () => {
    expect(canConfigureAiProviders({ isAuthenticated: true, isPaidActive: true })).toEqual({
      allowed: false,
      reason: 'PAID_REQUIRED',
    });
  });
});
