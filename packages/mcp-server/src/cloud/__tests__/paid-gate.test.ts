import { describe, expect, it } from 'vitest';

import { assertPaidCloudMcpAccess, isPaidEntitlement } from '../paid-gate.js';

function fakeClient(opts: {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  row?: { plan: string; status: string } | null;
  rowError?: { message: string } | null;
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: opts.user ?? null },
        error: opts.userError ?? null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.row ?? null,
            error: opts.rowError ?? null,
          }),
        }),
      }),
    }),
  };
}

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
    const result = await assertPaidCloudMcpAccess(
      fakeClient({ user: null, userError: { message: 'bad jwt' } }) as never,
      'tok',
    );
    expect(result).toEqual({ ok: false, status: 401, error: 'Invalid session' });
  });

  it('rejects free and past_due with 403', async () => {
    const free = await assertPaidCloudMcpAccess(
      fakeClient({ user: { id: 'u1' }, row: { plan: 'free', status: 'none' } }) as never,
      'tok',
    );
    expect(free).toEqual({
      ok: false,
      status: 403,
      error: 'Cloud MCP requires an active paid plan',
    });

    const pastDue = await assertPaidCloudMcpAccess(
      fakeClient({ user: { id: 'u1' }, row: { plan: 'paid', status: 'past_due' } }) as never,
      'tok',
    );
    expect(pastDue.ok).toBe(false);
    if (!pastDue.ok) expect(pastDue.status).toBe(403);
  });

  it('allows paid active', async () => {
    const result = await assertPaidCloudMcpAccess(
      fakeClient({ user: { id: 'u1' }, row: { plan: 'paid', status: 'active' } }) as never,
      'tok',
    );
    expect(result).toEqual({ ok: true });
  });
});
