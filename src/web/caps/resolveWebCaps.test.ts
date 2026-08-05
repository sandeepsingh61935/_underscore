import { describe, it, expect } from 'vitest';
import { resolveWebCaps } from './resolveWebCaps';

describe('resolveWebCaps', () => {
  it('guest: browse only', () => {
    const c = resolveWebCaps({ isAuthenticated: false, isPaidActive: false });
    expect(c.isGuest).toBe(true);
    expect(c.planLabel).toBe('Guest');
    expect(c.flags).toEqual({ sync: false, export: false, ai: false, mcp: false });
  });

  it('free signed-in: sync+export, no ai', () => {
    const c = resolveWebCaps({ isAuthenticated: true, isPaidActive: false, billingStatus: 'none' });
    expect(c.isGuest).toBe(false);
    expect(c.planLabel).toBe('Free');
    expect(c.flags).toEqual({ sync: true, export: true, ai: false, mcp: false });
  });

  it('paid active: all caps on', () => {
    const c = resolveWebCaps({ isAuthenticated: true, isPaidActive: true, billingStatus: 'active' });
    expect(c.planLabel).toBe('Paid');
    expect(c.flags.ai).toBe(true);
    expect(c.flags.mcp).toBe(true);
  });

  it('past due: AI locked, still Free/Past due label', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: false,
      billingStatus: 'past_due',
    });
    expect(c.isPastDue).toBe(true);
    expect(c.planLabel).toBe('Past due');
    expect(c.flags.ai).toBe(false);
    expect(c.flags.sync).toBe(true);
    expect(c.flags.export).toBe(true);
  });

  it('does not grant ai when unauthenticated even if isPaidActive true', () => {
    const c = resolveWebCaps({ isAuthenticated: false, isPaidActive: true });
    expect(c.flags.ai).toBe(false);
    expect(c.isGuest).toBe(true);
  });
});
