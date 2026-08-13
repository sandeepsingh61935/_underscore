import { describe, expect, it } from 'vitest';

import { resolveEntitlement } from '@/shared/entitlement/resolve-entitlement';

describe('resolveEntitlement', () => {
  it('guest: not authenticated, commercial flags off', () => {
    const view = resolveEntitlement({ isAuthenticated: false, isPaidActive: false });
    expect(view).toEqual({
      isAuthenticated: false,
      isPaidActive: false,
      flags: { ai: false, mcp: false },
    });
  });

  it('does not grant paid flags to a guest even if isPaidActive is true', () => {
    const view = resolveEntitlement({ isAuthenticated: false, isPaidActive: true });
    expect(view.isPaidActive).toBe(false);
    expect(view.flags).toEqual({ ai: false, mcp: false });
  });

  it('signed-in free: authenticated, commercial flags off', () => {
    const view = resolveEntitlement({ isAuthenticated: true, isPaidActive: false });
    expect(view.isAuthenticated).toBe(true);
    expect(view.isPaidActive).toBe(false);
    expect(view.flags).toEqual({ ai: false, mcp: false });
  });

  it('paid active: both AI and MCP on', () => {
    const view = resolveEntitlement({ isAuthenticated: true, isPaidActive: true });
    expect(view.isPaidActive).toBe(true);
    expect(view.flags).toEqual({ ai: true, mcp: true });
  });
});
