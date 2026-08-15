import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Keep in sync with `COMMERCIAL_FREE_WINDOW_ENABLED` in
 * src/shared/entitlement/commercial.ts (this package cannot import src/shared).
 * Flip both to false when free window ends.
 */
export const CLOUD_MCP_FREE_WINDOW_ENABLED = true;

export type PaidEntitlementRow = {
  plan?: string | null;
  status?: string | null;
};

/** Same rule as app `computeIsPaidActive` — this package cannot import src/shared. */
export function isPaidEntitlement(row: PaidEntitlementRow | null | undefined): boolean {
  if (!row) return false;
  return row.plan === 'paid' && (row.status === 'active' || row.status === 'trialing');
}

/** Past due always blocks Cloud MCP (even during free window). */
export function isPastDueEntitlement(row: PaidEntitlementRow | null | undefined): boolean {
  return row?.status === 'past_due';
}

/**
 * Cloud MCP access: paid active/trialing, or free window for authenticated non-past-due.
 */
export function isCloudMcpEntitlementAllowed(
  row: PaidEntitlementRow | null | undefined,
  freeWindow: boolean = CLOUD_MCP_FREE_WINDOW_ENABLED,
): boolean {
  if (isPastDueEntitlement(row)) return false;
  if (isPaidEntitlement(row)) return true;
  return freeWindow;
}

export type PaidGateResult =
  | { ok: true; userId: string }
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

  if (!isCloudMcpEntitlementAllowed(data)) {
    return {
      ok: false,
      status: 403,
      error: CLOUD_MCP_FREE_WINDOW_ENABLED
        ? 'Cloud MCP unavailable (payment past due or access revoked)'
        : 'Cloud MCP requires an active paid plan',
    };
  }

  return { ok: true, userId: userData.user.id };
}
