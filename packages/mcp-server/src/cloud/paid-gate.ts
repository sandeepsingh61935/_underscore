import type { SupabaseClient } from '@supabase/supabase-js';

export type PaidEntitlementRow = {
  plan?: string | null;
  status?: string | null;
};

/** Same rule as app `computeIsPaidActive` — this package cannot import src/shared. */
export function isPaidEntitlement(row: PaidEntitlementRow | null | undefined): boolean {
  if (!row) return false;
  return row.plan === 'paid' && (row.status === 'active' || row.status === 'trialing');
}

export type PaidGateResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function assertPaidCloudMcpAccess(
  client: SupabaseClient,
  token: string,
): Promise<PaidGateResult> {
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: 'Invalid session' };
  }

  const { data, error } = await client
    .from('billing_entitlements')
    .select('plan, status')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 503, error: 'Could not verify entitlement' };
  }

  if (!isPaidEntitlement(data)) {
    return { ok: false, status: 403, error: 'Cloud MCP requires an active paid plan' };
  }

  return { ok: true };
}
