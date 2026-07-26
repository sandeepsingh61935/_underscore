/**
 * Keep in sync with src/shared/billing/polar-sync.ts (unit-tested there).
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
