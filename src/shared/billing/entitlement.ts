/**
 * Pure entitlement helpers — no I/O. Safe for unit tests and edge runtimes.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type {
  BillingEntitlement,
  BillingEntitlementRow,
  BillingPlan,
  BillingProvider,
  BillingStatus,
} from './types';

const PAID_ACTIVE_STATUSES: ReadonlySet<BillingStatus> = new Set([
  'active',
  'trialing',
]);

export function isPaidActiveStatus(status: BillingStatus): boolean {
  return PAID_ACTIVE_STATUSES.has(status);
}

export function computeIsPaidActive(
  plan: BillingPlan,
  status: BillingStatus
): boolean {
  return plan === 'paid' && isPaidActiveStatus(status);
}

export function freeEntitlement(): BillingEntitlement {
  return {
    plan: 'free',
    status: 'none',
    isPaidActive: false,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    provider: null,
    manageUrlAvailable: false,
  };
}

export function rowToEntitlement(
  row: BillingEntitlementRow | null | undefined
): BillingEntitlement {
  if (!row) return freeEntitlement();

  const plan = row.plan;
  const status = row.status;
  const isPaidActive = computeIsPaidActive(plan, status);
  const provider = row.provider;

  return {
    plan,
    status,
    isPaidActive,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    provider,
    manageUrlAvailable:
      provider === 'polar' &&
      Boolean(row.provider_customer_id || isPaidActive || status === 'canceled'),
  };
}

/**
 * Project auth + entitlement onto the product mode.
 * Paid is never a free-user preference — only server entitlement unlocks pro_xai.
 */
export function projectModeFromEntitlement(
  isAuthenticated: boolean,
  entitlement: BillingEntitlement
): ModeType {
  if (!isAuthenticated) return 'basic';
  if (entitlement.isPaidActive) return 'pro_xai';
  return 'pro';
}

/**
 * Whether the client may switch into a mode manually.
 * pro_xai requires paid entitlement (unless allowDevOverride for local QA).
 */
export function canSelectMode(
  mode: ModeType,
  isAuthenticated: boolean,
  entitlement: BillingEntitlement,
  options?: { allowDevOverride?: boolean }
): boolean {
  if (mode === 'basic') {
    return !isAuthenticated || Boolean(options?.allowDevOverride);
  }
  if (!isAuthenticated) return false;
  if (mode === 'pro') return true;
  if (mode === 'pro_xai') {
    return entitlement.isPaidActive || Boolean(options?.allowDevOverride);
  }
  return false;
}

/** Map Polar subscription status strings onto our BillingStatus */
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
      return 'unpaid';
    case 'incomplete':
    case 'incomplete_expired':
      return 'unpaid';
    default:
      return 'none';
  }
}

/**
 * past_due keeps plan=paid (grace); canceled/unpaid/none → free.
 */
export function planFromPolarStatus(status: BillingStatus): BillingPlan {
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return 'paid';
  }
  return 'free';
}

/**
 * Build an upsert payload from a Polar subscription-like object.
 * userId is Supabase user.id (Polar external_customer_id).
 */
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

/**
 * Extract user id + subscription fields from a Polar webhook payload.
 * Supports subscription.* events and customer.state_changed with active subscriptions.
 */
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

  // subscription.* events: data is the subscription
  if (type.startsWith('subscription.')) {
    return parseSubscriptionLike(data);
  }

  // customer.state_changed: active_subscriptions[] + customer.external_id
  if (type === 'customer.state_changed' || type === 'customer.updated') {
    const customer = data;
    const externalId =
      typeof customer['external_id'] === 'string'
        ? customer['external_id']
        : null;
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
          polarCustomerId:
            typeof customer['id'] === 'string' ? customer['id'] : null,
          polarSubscriptionId:
            typeof sub['id'] === 'string' ? sub['id'] : null,
          currentPeriodEnd:
            typeof sub['current_period_end'] === 'string'
              ? sub['current_period_end']
              : null,
          cancelAtPeriodEnd: Boolean(sub['cancel_at_period_end']),
        };
      }
    }

    // No active subs — demote if we know the user
    if (externalId) {
      return {
        userId: externalId,
        polarStatus: 'canceled',
        polarCustomerId:
          typeof customer['id'] === 'string' ? customer['id'] : null,
        polarSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  return null;
}

function parseSubscriptionLike(
  data: Record<string, unknown>
): {
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
      typeof data['current_period_end'] === 'string'
        ? data['current_period_end']
        : null,
    cancelAtPeriodEnd: Boolean(data['cancel_at_period_end']),
  };
}
