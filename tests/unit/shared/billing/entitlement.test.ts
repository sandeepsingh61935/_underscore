import { describe, expect, it } from 'vitest';
import {
  computeEffectiveMode,
  computeIsPaidActive,
  entitlementUpsertFromPolarSubscription,
  extractPolarEntitlementSource,
  freeEntitlement,
  mapPolarSubscriptionStatus,
  planFromPolarStatus,
  rowToEntitlement,
  shouldSyncModeFromBilling,
  snapshotFromEntitlement,
} from '@/shared/billing';
import type { BillingEntitlementRow } from '@/shared/billing';

describe('billing entitlement helpers', () => {
  it('freeEntitlement is not paid-active', () => {
    const e = freeEntitlement();
    expect(e.isPaidActive).toBe(false);
    expect(e.plan).toBe('free');
  });

  it('computeIsPaidActive requires paid + active/trialing', () => {
    expect(computeIsPaidActive('paid', 'active')).toBe(true);
    expect(computeIsPaidActive('paid', 'trialing')).toBe(true);
    expect(computeIsPaidActive('paid', 'past_due')).toBe(false);
    expect(computeIsPaidActive('free', 'active')).toBe(false);
  });

  it('rowToEntitlement maps a paid active row', () => {
    const row: BillingEntitlementRow = {
      user_id: 'u1',
      plan: 'paid',
      status: 'active',
      provider: 'polar',
      provider_customer_id: 'cus_1',
      provider_subscription_id: 'sub_1',
      current_period_end: '2030-01-01T00:00:00Z',
      cancel_at_period_end: false,
      raw_status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    };
    const e = rowToEntitlement(row);
    expect(e.isPaidActive).toBe(true);
    expect(e.manageUrlAvailable).toBe(true);
  });

  it('computeEffectiveMode projects auth + paid', () => {
    expect(computeEffectiveMode(false, false)).toBe('basic');
    expect(computeEffectiveMode(true, false)).toBe('pro');
    expect(computeEffectiveMode(true, true)).toBe('pro_xai');
  });

  it('shouldSyncModeFromBilling only when ready', () => {
    expect(shouldSyncModeFromBilling('ready')).toBe(true);
    expect(shouldSyncModeFromBilling('error')).toBe(false);
    expect(shouldSyncModeFromBilling('loading')).toBe(false);
    expect(shouldSyncModeFromBilling('idle')).toBe(false);
  });

  it('snapshotFromEntitlement forcePaid for dev override', () => {
    const snap = snapshotFromEntitlement(freeEntitlement(), {
      loadState: 'ready',
      forcePaid: true,
    });
    expect(snap.isPaidActive).toBe(true);
    expect(snap.entitlement.isPaidActive).toBe(false);
  });

  it('maps Polar subscription statuses', () => {
    expect(mapPolarSubscriptionStatus('active')).toBe('active');
    expect(mapPolarSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapPolarSubscriptionStatus('canceled')).toBe('canceled');
    expect(planFromPolarStatus('past_due')).toBe('paid');
    expect(planFromPolarStatus('canceled')).toBe('free');
  });

  it('builds upsert payload from Polar subscription', () => {
    const row = entitlementUpsertFromPolarSubscription({
      userId: 'user-uuid',
      polarStatus: 'active',
      polarCustomerId: 'cus',
      polarSubscriptionId: 'sub',
      currentPeriodEnd: '2030-01-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    });
    expect(row.user_id).toBe('user-uuid');
    expect(row.plan).toBe('paid');
    expect(row.status).toBe('active');
    expect(row.provider).toBe('polar');
  });

  it('extracts entitlement source from subscription webhook', () => {
    const source = extractPolarEntitlementSource({
      type: 'subscription.updated',
      data: {
        id: 'sub_1',
        status: 'active',
        current_period_end: '2030-01-01T00:00:00Z',
        cancel_at_period_end: false,
        customer: { id: 'cus_1', external_id: 'user-uuid' },
      },
    });
    expect(source?.userId).toBe('user-uuid');
    expect(source?.polarStatus).toBe('active');
  });

  it('extracts demotion from customer.state_changed with no active subs', () => {
    const source = extractPolarEntitlementSource({
      type: 'customer.state_changed',
      data: {
        id: 'cus_1',
        external_id: 'user-uuid',
        active_subscriptions: [],
      },
    });
    expect(source?.userId).toBe('user-uuid');
    expect(source?.polarStatus).toBe('canceled');
  });

  it('ignores order.* events (order status is not subscription status)', () => {
    const source = extractPolarEntitlementSource({
      type: 'order.paid',
      data: {
        id: 'ord_1',
        status: 'paid',
        customer: { id: 'cus_1', external_id: 'user-uuid' },
      },
    });
    expect(source).toBeNull();
  });
});
