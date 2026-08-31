import { describe, expect, it } from 'vitest';
import {
  BILLING_FOCUS_SYNC_MIN_INTERVAL_MS,
  resolveBillingSyncFromSubscriptions,
  shouldRunFocusBillingSync,
} from '@/shared/billing/polar-sync';

const product = 'prod-paid-uuid';

describe('resolveBillingSyncFromSubscriptions', () => {
  it('upserts free when Polar customer does not exist', () => {
    expect(
      resolveBillingSyncFromSubscriptions({
        allowedProductId: product,
        subscriptions: [],
        customerExists: false,
      })
    ).toEqual({ action: 'upsert_free', reason: 'no_polar_customer' });
  });

  it('upserts free when allowlist product is missing', () => {
    expect(
      resolveBillingSyncFromSubscriptions({
        allowedProductId: null,
        subscriptions: [{ id: 's1', status: 'active', product_id: product }],
        customerExists: true,
      })
    ).toEqual({ action: 'upsert_free', reason: 'product_id_not_configured' });
  });

  it('does not fall back to another product active subscription', () => {
    const r = resolveBillingSyncFromSubscriptions({
      allowedProductId: product,
      subscriptions: [{ id: 'other', status: 'active', product_id: 'other-product' }],
      customerExists: true,
    });
    expect(r).toEqual({
      action: 'upsert_free',
      reason: 'no_matching_product_subscription',
    });
  });

  it('does not grant when product_id is missing on active sub', () => {
    const r = resolveBillingSyncFromSubscriptions({
      allowedProductId: product,
      subscriptions: [{ id: 's1', status: 'active' }],
      customerExists: true,
    });
    expect(r.action).toBe('upsert_free');
  });

  it('grants from exact product match only', () => {
    const sub = {
      id: 'sub_paid',
      status: 'active',
      product_id: product,
      current_period_end: '2030-01-01T00:00:00Z',
    };
    const r = resolveBillingSyncFromSubscriptions({
      allowedProductId: product,
      subscriptions: [{ id: 'other', status: 'active', product_id: 'other' }, sub],
      customerExists: true,
    });
    expect(r).toEqual({
      action: 'upsert_from_sub',
      reason: 'product_match',
      sub,
    });
  });
});

describe('shouldRunFocusBillingSync', () => {
  it('allows first sync when never synced', () => {
    expect(shouldRunFocusBillingSync(0, 1_000_000)).toBe(true);
  });

  it('blocks within min interval', () => {
    const t0 = 1_000_000;
    expect(
      shouldRunFocusBillingSync(t0, t0 + BILLING_FOCUS_SYNC_MIN_INTERVAL_MS - 1)
    ).toBe(false);
  });

  it('allows after min interval', () => {
    const t0 = 1_000_000;
    expect(shouldRunFocusBillingSync(t0, t0 + BILLING_FOCUS_SYNC_MIN_INTERVAL_MS)).toBe(
      true
    );
  });
});
