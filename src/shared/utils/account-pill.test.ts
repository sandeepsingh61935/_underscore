import { describe, it, expect } from 'vitest';
import { resolveAccountPillLabel } from './account-pill';

describe('resolveAccountPillLabel', () => {
  it('returns Guest when not authenticated', () => {
    expect(
      resolveAccountPillLabel({
        modeId: 'basic',
        isAuthenticated: false,
        isPaidActive: false,
      })
    ).toBe('Guest');
  });

  it('returns Guest when mode is basic even if authenticated flag glitches', () => {
    expect(
      resolveAccountPillLabel({
        modeId: 'basic',
        isAuthenticated: true,
        isPaidActive: false,
      })
    ).toBe('Guest');
  });

  it('returns Free for pro without paid active', () => {
    expect(
      resolveAccountPillLabel({
        modeId: 'pro',
        isAuthenticated: true,
        isPaidActive: false,
      })
    ).toBe('Free');
  });

  it('returns Paid when isPaidActive', () => {
    expect(
      resolveAccountPillLabel({
        modeId: 'pro_xai',
        isAuthenticated: true,
        isPaidActive: true,
      })
    ).toBe('Paid');
  });

  it('returns Past due when billingStatus is past_due even if plan looks paid', () => {
    expect(
      resolveAccountPillLabel({
        modeId: 'pro_xai',
        isAuthenticated: true,
        isPaidActive: false,
        billingStatus: 'past_due',
      })
    ).toBe('Past due');
  });
});
