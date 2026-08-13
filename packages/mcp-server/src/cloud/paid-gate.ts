/**
 * Cloud MCP commercial gate (ADR-029 §5).
 * Duplicate of app `computeIsPaidActive` — this package cannot import src/shared.
 */

export type PaidEntitlementRow = {
  plan?: string | null;
  status?: string | null;
};

export function isPaidEntitlement(row: PaidEntitlementRow | null | undefined): boolean {
  if (!row) return false;
  return row.plan === 'paid' && (row.status === 'active' || row.status === 'trialing');
}

export type PaidGateResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function assertPaidCloudMcpAccess(opts: {
  getUser: () => Promise<{ user: { id: string } | null; error: { message: string } | null }>;
  getEntitlement: (userId: string) => Promise<{
    data: PaidEntitlementRow | null;
    error: { message: string } | null;
  }>;
}): Promise<PaidGateResult> {
  const { user, error: userError } = await opts.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, error: 'Invalid session' };
  }

  const { data, error } = await opts.getEntitlement(user.id);
  if (error) {
    return { ok: false, status: 503, error: 'Could not verify entitlement' };
  }

  if (!isPaidEntitlement(data)) {
    return { ok: false, status: 403, error: 'Cloud MCP requires an active paid plan' };
  }

  return { ok: true };
}
