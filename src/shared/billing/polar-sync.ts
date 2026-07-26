/**
 * Pure product selection for billing-sync pull path.
 * Mirrors webhook fail-closed product rules (S-2): only our product grants paid.
 * Edge function must apply the same algorithm (Deno copy / keep in sync).
 */

export interface PolarActiveSubscriptionLike {
  id?: string;
  status?: string;
  product_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

export type BillingSyncResolveResult =
  | { action: 'upsert_free'; reason: string }
  | {
      action: 'upsert_from_sub';
      reason: string;
      sub: PolarActiveSubscriptionLike;
    };

/**
 * Decide what to write to billing_entitlements from Polar customer state.
 *
 * - No customer / no matching product sub → free (caller must upsert demotion).
 * - Exact product_id match only — never fall back to "any active" subscription.
 * - Missing allowlist product → free (fail closed).
 */
export function resolveBillingSyncFromSubscriptions(input: {
  allowedProductId: string | null | undefined;
  subscriptions: PolarActiveSubscriptionLike[];
  customerExists: boolean;
}): BillingSyncResolveResult {
  if (!input.customerExists) {
    return { action: 'upsert_free', reason: 'no_polar_customer' };
  }

  const allowed =
    typeof input.allowedProductId === 'string' && input.allowedProductId.trim()
      ? input.allowedProductId.trim()
      : null;

  if (!allowed) {
    return { action: 'upsert_free', reason: 'product_id_not_configured' };
  }

  const match =
    input.subscriptions.find(
      (s) =>
        typeof s.product_id === 'string' &&
        s.product_id.trim() === allowed
    ) ?? null;

  if (!match) {
    return {
      action: 'upsert_free',
      reason: 'no_matching_product_subscription',
    };
  }

  return {
    action: 'upsert_from_sub',
    reason: 'product_match',
    sub: match,
  };
}

/** Min interval between focus-driven Polar syncs (client). */
export const BILLING_FOCUS_SYNC_MIN_INTERVAL_MS = 45_000;

export function shouldRunFocusBillingSync(
  lastSyncAtMs: number,
  nowMs: number,
  minIntervalMs: number = BILLING_FOCUS_SYNC_MIN_INTERVAL_MS
): boolean {
  if (!Number.isFinite(lastSyncAtMs) || lastSyncAtMs <= 0) return true;
  return nowMs - lastSyncAtMs >= minIntervalMs;
}
