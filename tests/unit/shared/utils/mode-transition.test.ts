import { describe, expect, it } from 'vitest';

import {
  canPersistMode,
  clampModeToEntitlement,
  resolveBillingModeWrite,
  resolveModeTransition,
} from '@/shared/utils/mode-transition';

describe('resolveModeTransition', () => {
  it('guest: Free/Paid require sign-in', () => {
    expect(
      resolveModeTransition({
        from: 'basic',
        to: 'pro',
        isAuthenticated: false,
        isPaidActive: false,
      }).kind,
    ).toBe('sign_in');
    expect(
      resolveModeTransition({
        from: 'basic',
        to: 'pro_xai',
        isAuthenticated: false,
        isPaidActive: false,
      }).kind,
    ).toBe('sign_in');
  });

  it('free user: Free→Paid is upgrade, not persist', () => {
    const r = resolveModeTransition({
      from: 'pro',
      to: 'pro_xai',
      isAuthenticated: true,
      isPaidActive: false,
    });
    expect(r.kind).toBe('upgrade');
    expect(canPersistMode({
      from: 'pro',
      to: 'pro_xai',
      isAuthenticated: true,
      isPaidActive: false,
    })).toBe(false);
  });

  it('paid user: Free→Paid and Paid→Free are persist', () => {
    expect(
      resolveModeTransition({
        from: 'pro',
        to: 'pro_xai',
        isAuthenticated: true,
        isPaidActive: true,
      }),
    ).toMatchObject({ kind: 'persist', mode: 'pro_xai' });

    expect(
      resolveModeTransition({
        from: 'pro_xai',
        to: 'pro',
        isAuthenticated: true,
        isPaidActive: true,
      }),
    ).toMatchObject({ kind: 'persist', mode: 'pro' });
  });

  it('signed-in: Guest is sign_out', () => {
    expect(
      resolveModeTransition({
        from: 'pro',
        to: 'basic',
        isAuthenticated: true,
        isPaidActive: true,
      }).kind,
    ).toBe('sign_out');
  });
});

describe('clampModeToEntitlement', () => {
  it('demotes unpaid AI to Free', () => {
    expect(clampModeToEntitlement(true, false, 'pro_xai')).toBe('pro');
  });

  it('keeps paid Free preference', () => {
    expect(clampModeToEntitlement(true, true, 'pro')).toBe('pro');
  });

  it('keeps paid Paid preference', () => {
    expect(clampModeToEntitlement(true, true, 'pro_xai')).toBe('pro_xai');
  });

  it('guest when unauthenticated', () => {
    expect(clampModeToEntitlement(false, false, 'pro')).toBe('basic');
  });
});

describe('resolveBillingModeWrite', () => {
  it('does not force paid users off Free preference', () => {
    const r = resolveBillingModeWrite({
      isAuthenticated: true,
      isPaidActive: true,
      currentMode: 'pro',
      previousIsPaidActive: true,
    });
    expect(r.write).toBe(false);
    expect(r.mode).toBe('pro');
  });

  it('promotes Free→Paid mode on rising edge after checkout', () => {
    const r = resolveBillingModeWrite({
      isAuthenticated: true,
      isPaidActive: true,
      currentMode: 'pro',
      previousIsPaidActive: false,
    });
    expect(r).toEqual({ write: true, mode: 'pro_xai' });
  });

  it('demotes AI when entitlement lapses', () => {
    const r = resolveBillingModeWrite({
      isAuthenticated: true,
      isPaidActive: false,
      currentMode: 'pro_xai',
      previousIsPaidActive: true,
    });
    expect(r).toEqual({ write: true, mode: 'pro' });
  });

  it('first ready sample while paid on Free does not force (null prev)', () => {
    const r = resolveBillingModeWrite({
      isAuthenticated: true,
      isPaidActive: true,
      currentMode: 'pro',
      previousIsPaidActive: null,
    });
    expect(r.write).toBe(false);
  });
});
