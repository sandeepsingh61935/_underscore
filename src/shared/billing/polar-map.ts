/**
 * Pure Polar → entitlement mapping.
 * Single source of truth for app tests and edge function logic
 * (edge keeps a Deno-side copy of the same algorithm in _shared/polar.ts — keep in sync).
 */

import type { BillingPlan, BillingProvider, BillingStatus } from './types';

export function mapPolarSubscriptionStatus(
  polarStatus: string | null | undefined
): BillingStatus {
  switch ((polarStatus ?? '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'unpaid';
    default:
      return 'none';
  }
}

/** past_due keeps plan=paid (grace for billing UI); isPaidActive still false. */
export function planFromPolarStatus(status: BillingStatus): BillingPlan {
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return 'paid';
  }
  return 'free';
}

export function entitlementUpsertFromPolarSubscription(input: {
  userId: string;
  polarStatus: string;
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}): {
  user_id: string;
  plan: BillingPlan;
  status: BillingStatus;
  provider: BillingProvider;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  raw_status: string;
  updated_at: string;
} {
  const status = mapPolarSubscriptionStatus(input.polarStatus);
  const plan = planFromPolarStatus(status);

  return {
    user_id: input.userId,
    plan,
    status,
    provider: 'polar',
    provider_customer_id: input.polarCustomerId ?? null,
    provider_subscription_id: input.polarSubscriptionId ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
    raw_status: input.polarStatus,
    updated_at: new Date().toISOString(),
  };
}

export function extractPolarEntitlementSource(event: {
  type?: string;
  data?: Record<string, unknown> | null;
}): {
  userId: string;
  polarStatus: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null {
  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  const type = event.type ?? '';

  if (type.startsWith('subscription.')) {
    return parseSubscriptionLike(data);
  }

  if (type === 'customer.state_changed' || type === 'customer.updated') {
    const customer = data;
    const externalId =
      typeof customer['external_id'] === 'string' ? customer['external_id'] : null;
    const activeSubs = Array.isArray(customer['active_subscriptions'])
      ? (customer['active_subscriptions'] as Record<string, unknown>[])
      : [];

    if (activeSubs.length > 0) {
      const sub = activeSubs[0]!;
      const parsed = parseSubscriptionLike(sub);
      if (parsed) return parsed;
      if (externalId) {
        return {
          userId: externalId,
          polarStatus: String(sub['status'] ?? 'active'),
          polarCustomerId: typeof customer['id'] === 'string' ? customer['id'] : null,
          polarSubscriptionId: typeof sub['id'] === 'string' ? sub['id'] : null,
          currentPeriodEnd:
            typeof sub['current_period_end'] === 'string'
              ? sub['current_period_end']
              : null,
          cancelAtPeriodEnd: Boolean(sub['cancel_at_period_end']),
        };
      }
    }

    if (externalId) {
      return {
        userId: externalId,
        polarStatus: 'canceled',
        polarCustomerId: typeof customer['id'] === 'string' ? customer['id'] : null,
        polarSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  return null;
}

function parseSubscriptionLike(data: Record<string, unknown>): {
  userId: string;
  polarStatus: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null {
  const customer = (data['customer'] ?? null) as Record<string, unknown> | null;
  const externalFromCustomer =
    customer && typeof customer['external_id'] === 'string'
      ? customer['external_id']
      : null;
  const externalDirect =
    typeof data['customer_external_id'] === 'string'
      ? data['customer_external_id']
      : typeof data['external_customer_id'] === 'string'
        ? data['external_customer_id']
        : null;

  const userId = externalFromCustomer ?? externalDirect;
  if (!userId) return null;

  const polarCustomerId =
    (customer && typeof customer['id'] === 'string' ? customer['id'] : null) ??
    (typeof data['customer_id'] === 'string' ? data['customer_id'] : null);

  return {
    userId,
    polarStatus: String(data['status'] ?? 'none'),
    polarCustomerId,
    polarSubscriptionId: typeof data['id'] === 'string' ? data['id'] : null,
    currentPeriodEnd:
      typeof data['current_period_end'] === 'string' ? data['current_period_end'] : null,
    cancelAtPeriodEnd: Boolean(data['cancel_at_period_end']),
  };
}
