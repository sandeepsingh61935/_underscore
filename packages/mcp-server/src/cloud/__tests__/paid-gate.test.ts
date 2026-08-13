import { describe, expect, it } from 'vitest';

import { assertPaidCloudMcpAccess, isPaidEntitlement } from '../paid-gate.js';

describe('isPaidEntitlement', () => {
  it('is true only for paid + active/trialing', () => {
    expect(isPaidEntitlement({ plan: 'paid', status: 'active' })).toBe(true);
    expect(isPaidEntitlement({ plan: 'paid', status: 'trialing' })).toBe(true);
    expect(isPaidEntitlement({ plan: 'paid', status: 'past_due' })).toBe(false);
    expect(isPaidEntitlement({ plan: 'free', status: 'active' })).toBe(false);
    expect(isPaidEntitlement(null)).toBe(false);
  });
});

describe('assertPaidCloudMcpAccess', () => {
  it('rejects invalid sessions with 401', async () => {
    const result = await assertPaidCloudMcpAccess({
      getUser: async () => ({ user: null, error: { message: 'bad jwt' } }),
      getEntitlement: async () => ({ data: null, error: null }),
    });
    expect(result).toEqual({ ok: false, status: 401, error: 'Invalid session' });
  });

  it('rejects free and past_due with 403', async () => {
    const free = await assertPaidCloudMcpAccess({
      getUser: async () => ({ user: { id: 'u1' }, error: null }),
      getEntitlement: async () => ({ data: { plan: 'free', status: 'none' }, error: null }),
    });
    expect(free).toEqual({
      ok: false,
      status: 403,
      error: 'Cloud MCP requires an active paid plan',
    });

    const pastDue = await assertPaidCloudMcpAccess({
      getUser: async () => ({ user: { id: 'u1' }, error: null }),
      getEntitlement: async () => ({ data: { plan: 'paid', status: 'past_due' }, error: null }),
    });
    expect(pastDue.ok).toBe(false);
    if (!pastDue.ok) expect(pastDue.status).toBe(403);
  });

  it('allows paid active', async () => {
    const result = await assertPaidCloudMcpAccess({
      getUser: async () => ({ user: { id: 'u1' }, error: null }),
      getEntitlement: async () => ({ data: { plan: 'paid', status: 'active' }, error: null }),
    });
    expect(result).toEqual({ ok: true });
  });
});
