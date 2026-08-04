import { describe, expect, it } from 'vitest';

import { resolveAskLockReason } from '@/shared/utils/ask-lock';

describe('resolveAskLockReason', () => {
  it('locks Guest when unauthenticated', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: false,
        isPaidActive: false,
        hasModel: false,
      }),
    ).toBe('guest');
  });

  it('locks Guest even if paid flags look set (client cannot grant)', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: false,
        isPaidActive: true,
        billingStatus: 'active',
        hasModel: true,
        aiCapability: true,
      }),
    ).toBe('guest');
  });

  it('locks Free when signed in without paid entitlement', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: false,
        billingStatus: 'none',
        hasModel: false,
      }),
    ).toBe('free');
  });

  it('locks past_due before free when billing is past due', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: false,
        billingStatus: 'past_due',
        hasModel: true,
        aiCapability: true,
      }),
    ).toBe('past_due');
  });

  it('locks free when paid inactive and status is canceled', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: false,
        billingStatus: 'canceled',
        hasModel: true,
      }),
    ).toBe('free');
  });

  it('locks free when paid active but AI capability denied', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: true,
        billingStatus: 'active',
        hasModel: true,
        aiCapability: false,
      }),
    ).toBe('free');
  });

  it('locks no_model when paid + capability but no provider', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: true,
        billingStatus: 'active',
        hasModel: false,
        aiCapability: true,
      }),
    ).toBe('no_model');
  });

  it('unlocks when paid + capability + model', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: true,
        billingStatus: 'active',
        hasModel: true,
        aiCapability: true,
      }),
    ).toBeNull();
  });

  it('unlocks when paid + model and capability omitted (default ok)', () => {
    expect(
      resolveAskLockReason({
        isAuthenticated: true,
        isPaidActive: true,
        billingStatus: 'trialing',
        hasModel: true,
      }),
    ).toBeNull();
  });
});
