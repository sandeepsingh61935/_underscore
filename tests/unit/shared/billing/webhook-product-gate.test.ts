import { describe, expect, it } from 'vitest';
import {
  decideWebhookEntitlementWrite,
  extractPolarProductId,
} from '@/shared/billing/webhook-product-gate';

describe('decideWebhookEntitlementWrite (S-2 fail-closed product)', () => {
  const allowed = 'prod-paid-uuid';

  it('allows active grant when product matches', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'active',
        allowedProductId: allowed,
        eventProductId: allowed,
      })
    ).toEqual({ write: true });
  });

  it('allows trialing and past_due when product matches', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'trialing',
        allowedProductId: allowed,
        eventProductId: allowed,
      }).write
    ).toBe(true);
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'past_due',
        allowedProductId: allowed,
        eventProductId: allowed,
      }).write
    ).toBe(true);
  });

  it('rejects active grant when product id missing', () => {
    const r = decideWebhookEntitlementWrite({
      polarStatus: 'active',
      allowedProductId: allowed,
      eventProductId: null,
    });
    expect(r.write).toBe(false);
    if (!r.write) expect(r.reason).toMatch(/missing/i);
  });

  it('rejects active grant when product does not match', () => {
    const r = decideWebhookEntitlementWrite({
      polarStatus: 'active',
      allowedProductId: allowed,
      eventProductId: 'other-product',
    });
    expect(r.write).toBe(false);
  });

  it('rejects active grant when POLAR_PRODUCT_ID not configured', () => {
    const r = decideWebhookEntitlementWrite({
      polarStatus: 'active',
      allowedProductId: null,
      eventProductId: allowed,
    });
    expect(r.write).toBe(false);
    if (!r.write) expect(r.reason).toMatch(/not configured/i);
  });

  it('allows cancel demotion without product id', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'canceled',
        allowedProductId: allowed,
        eventProductId: null,
      })
    ).toEqual({ write: true });
  });

  it('allows cancel when product matches', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'canceled',
        allowedProductId: allowed,
        eventProductId: allowed,
      }).write
    ).toBe(true);
  });

  it('skips cancel when product is present and not allowlisted', () => {
    const r = decideWebhookEntitlementWrite({
      polarStatus: 'canceled',
      allowedProductId: allowed,
      eventProductId: 'other-product',
    });
    expect(r.write).toBe(false);
  });
});

describe('extractPolarProductId', () => {
  it('reads product_id', () => {
    expect(
      extractPolarProductId({ data: { product_id: 'p1' } })
    ).toBe('p1');
  });

  it('reads product.id', () => {
    expect(
      extractPolarProductId({ data: { product: { id: 'p2' } } })
    ).toBe('p2');
  });

  it('reads nested items product id', () => {
    expect(
      extractPolarProductId({
        data: {
          items: [{ product_id: 'p3' }],
        },
      })
    ).toBe('p3');
  });

  it('returns null when absent', () => {
    expect(extractPolarProductId({ data: {} })).toBeNull();
    expect(extractPolarProductId({})).toBeNull();
  });
});
