import { describe, it, expect } from 'vitest';
import { resolveWebPaidActive } from './resolveWebPaidActive';

describe('resolveWebPaidActive', () => {
  it('returns false when billing is null', () => {
    expect(resolveWebPaidActive(null)).toBe(false);
    expect(resolveWebPaidActive(undefined)).toBe(false);
  });

  it('when ready, uses snapshot.isPaidActive only', () => {
    expect(
      resolveWebPaidActive({
        loadState: 'ready',
        isPaidActive: true,
        entitlement: { isPaidActive: false },
      })
    ).toBe(true);
    expect(
      resolveWebPaidActive({
        loadState: 'ready',
        isPaidActive: false,
        entitlement: { isPaidActive: true },
      })
    ).toBe(false);
  });

  it('when not ready, never demotes: OR of entitlement and snapshot', () => {
    expect(
      resolveWebPaidActive({
        loadState: 'loading',
        isPaidActive: false,
        entitlement: { isPaidActive: true },
      })
    ).toBe(true);
    expect(
      resolveWebPaidActive({
        loadState: 'error',
        isPaidActive: true,
        entitlement: { isPaidActive: false },
      })
    ).toBe(true);
    expect(
      resolveWebPaidActive({
        loadState: 'idle',
        isPaidActive: false,
        entitlement: { isPaidActive: false },
      })
    ).toBe(false);
  });

  it('handles missing entitlement when not ready', () => {
    expect(
      resolveWebPaidActive({
        loadState: 'loading',
        isPaidActive: true,
      })
    ).toBe(true);
    expect(
      resolveWebPaidActive({
        loadState: 'loading',
        isPaidActive: false,
      })
    ).toBe(false);
  });
});
