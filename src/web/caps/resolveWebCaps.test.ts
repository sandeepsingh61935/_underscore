import { describe, expect, it } from 'vitest';

import { resolveWebCaps } from './resolveWebCaps';

describe('resolveWebCaps', () => {
  it('guest: no sync/export/mcp/ai', () => {
    const c = resolveWebCaps({
      isAuthenticated: false,
      isPaidActive: false,
      freeWindow: true,
    });
    expect(c.isGuest).toBe(true);
    expect(c.flags).toEqual({
      sync: false,
      export: false,
      ai: false,
      mcp: false,
    });
  });

  it('signed-in free + free window: mcp on, ai off', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: false,
      billingStatus: 'none',
      freeWindow: true,
    });
    expect(c.planLabel).toBe('Free');
    expect(c.flags.ai).toBe(false);
    expect(c.flags.mcp).toBe(true);
    expect(c.flags.sync).toBe(true);
    expect(c.flags.export).toBe(true);
  });

  it('signed-in free + free window off: mcp off, ai off', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: false,
      billingStatus: 'none',
      freeWindow: false,
    });
    expect(c.flags.ai).toBe(false);
    expect(c.flags.mcp).toBe(false);
  });

  it('paid: mcp on, ai still off (Ask retired)', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: true,
      billingStatus: 'active',
      freeWindow: false,
    });
    expect(c.planLabel).toBe('Paid');
    expect(c.flags.ai).toBe(false);
    expect(c.flags.mcp).toBe(true);
  });

  it('past due: mcp off even with free window', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: false,
      billingStatus: 'past_due',
      freeWindow: true,
    });
    expect(c.planLabel).toBe('Past due');
    expect(c.flags.mcp).toBe(false);
    expect(c.flags.sync).toBe(true);
  });

  it('does not grant mcp when unauthenticated even if isPaidActive true', () => {
    const c = resolveWebCaps({
      isAuthenticated: false,
      isPaidActive: true,
      freeWindow: true,
    });
    expect(c.flags.mcp).toBe(false);
    expect(c.flags.ai).toBe(false);
  });
});
