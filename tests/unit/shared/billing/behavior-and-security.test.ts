/**
 * Behavior + security scenario tests for Polar billing.
 * Pure logic only — mirrors what Sync / webhook should produce for real user flows.
 */
import { describe, expect, it } from 'vitest';
import {
  computeEffectiveMode,
  computeIsPaidActive,
  entitlementUpsertFromPolarSubscription,
  extractPolarEntitlementSource,
  freeEntitlement,
  isAllowedBillingCorsOrigin,
  isAllowedBillingRedirectUrl,
  isBillingDevOverrideEnabled,
  parseBillingAllowedOrigins,
  resolveBillingRedirectUrl,
  rowToEntitlement,
  shouldSyncModeFromBilling,
  snapshotFromEntitlement,
} from '@/shared/billing';
import { assertPolarCheckoutUrl } from '@/shared/billing/polar-checkout-url';
import {
  resolveBillingSyncFromSubscriptions,
  shouldRunFocusBillingSync,
} from '@/shared/billing/polar-sync';
import { decideWebhookEntitlementWrite } from '@/shared/billing/webhook-product-gate';
import {
  createEmptyRateBucket,
  tryConsumeRateLimit,
} from '@/shared/billing/rate-limit';
import type { BillingEntitlementRow } from '@/shared/billing';

const PRODUCT = 'prod-paid-uuid';
const EXT_ORIGIN = 'chrome-extension://hecejpjekcgpifnemddfmkjmphmgljlm';
const WEB_ORIGIN = 'https://underscore-web.pages.dev';
const ALLOWED = [WEB_ORIGIN, EXT_ORIGIN, 'http://localhost:3000'];

function rowFromPolar(input: {
  status: string;
  cancelAtPeriodEnd?: boolean;
  productId?: string;
}): BillingEntitlementRow {
  const upsert = entitlementUpsertFromPolarSubscription({
    userId: 'user-uuid',
    polarStatus: input.status,
    polarCustomerId: 'cus_1',
    polarSubscriptionId: 'sub_1',
    currentPeriodEnd: '2030-06-01T00:00:00Z',
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
  });
  return {
    ...upsert,
    created_at: upsert.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Behavior: user-visible lifecycle
// ---------------------------------------------------------------------------

describe('behavior: subscription lifecycle (what users should see)', () => {
  it('B1: after successful pay — Paid + pro_xai', () => {
    const e = rowToEntitlement(rowFromPolar({ status: 'active' }));
    expect(e.plan).toBe('paid');
    expect(e.isPaidActive).toBe(true);
    expect(computeEffectiveMode(true, e.isPaidActive)).toBe('pro_xai');
  });

  it('B2: cancel at period end — still Paid until period ends (Polar default)', () => {
    // Polar keeps status=active and sets cancel_at_period_end=true
    const upsert = entitlementUpsertFromPolarSubscription({
      userId: 'user-uuid',
      polarStatus: 'active',
      polarCustomerId: 'cus_1',
      polarSubscriptionId: 'sub_1',
      currentPeriodEnd: '2030-06-01T00:00:00Z',
      cancelAtPeriodEnd: true,
    });
    expect(upsert.plan).toBe('paid');
    expect(upsert.status).toBe('active');
    expect(upsert.cancel_at_period_end).toBe(true);

    const e = rowToEntitlement({
      ...upsert,
      created_at: upsert.updated_at,
    });
    // UI pill "Paid" is driven by isPaidActive — must remain true
    expect(e.isPaidActive).toBe(true);
    expect(e.cancelAtPeriodEnd).toBe(true);
    expect(computeEffectiveMode(true, e.isPaidActive)).toBe('pro_xai');
  });

  it('B3: sync after cancel-at-period-end still finds active product sub → keeps paid', () => {
    const decision = resolveBillingSyncFromSubscriptions({
      allowedProductId: PRODUCT,
      customerExists: true,
      subscriptions: [
        {
          id: 'sub_1',
          status: 'active',
          product_id: PRODUCT,
          cancel_at_period_end: true,
          current_period_end: '2030-06-01T00:00:00Z',
        },
      ],
    });
    expect(decision.action).toBe('upsert_from_sub');
    if (decision.action === 'upsert_from_sub') {
      const row = entitlementUpsertFromPolarSubscription({
        userId: 'user-uuid',
        polarStatus: decision.sub.status ?? 'active',
        polarCustomerId: 'cus_1',
        polarSubscriptionId: decision.sub.id ?? null,
        currentPeriodEnd: decision.sub.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(decision.sub.cancel_at_period_end),
      });
      expect(row.plan).toBe('paid');
      expect(row.cancel_at_period_end).toBe(true);
      expect(computeIsPaidActive(row.plan, row.status)).toBe(true);
    }
  });

  it('B4: after period ends / immediate revoke — Free', () => {
    // No active_subscriptions → demote
    const decision = resolveBillingSyncFromSubscriptions({
      allowedProductId: PRODUCT,
      customerExists: true,
      subscriptions: [],
    });
    expect(decision.action).toBe('upsert_free');

    const freeRow = entitlementUpsertFromPolarSubscription({
      userId: 'user-uuid',
      polarStatus: 'canceled',
      polarCustomerId: 'cus_1',
      polarSubscriptionId: null,
      cancelAtPeriodEnd: false,
    });
    expect(freeRow.plan).toBe('free');
    expect(freeRow.status).toBe('canceled');
    const e = rowToEntitlement({ ...freeRow, created_at: freeRow.updated_at });
    expect(e.isPaidActive).toBe(false);
    expect(computeEffectiveMode(true, e.isPaidActive)).toBe('pro');
  });

  it('B5: subscription.canceled webhook while still active (Polar cancel event) keeps paid', () => {
    // Polar docs: subscription.canceled at period-end schedule still has status active
    const source = extractPolarEntitlementSource({
      type: 'subscription.canceled',
      data: {
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: '2030-06-01T00:00:00Z',
        product_id: PRODUCT,
        customer: { id: 'cus_1', external_id: 'user-uuid' },
      },
    });
    expect(source?.polarStatus).toBe('active');
    expect(source?.cancelAtPeriodEnd).toBe(true);
    const row = entitlementUpsertFromPolarSubscription({
      userId: source!.userId,
      polarStatus: source!.polarStatus,
      polarCustomerId: source!.polarCustomerId,
      polarSubscriptionId: source!.polarSubscriptionId,
      currentPeriodEnd: source!.currentPeriodEnd,
      cancelAtPeriodEnd: source!.cancelAtPeriodEnd,
    });
    expect(row.plan).toBe('paid');
    expect(computeIsPaidActive(row.plan, row.status)).toBe(true);
  });

  it('B6: past_due — plan paid for UI grace, but isPaidActive false (locks AI)', () => {
    const e = rowToEntitlement(rowFromPolar({ status: 'past_due' }));
    expect(e.plan).toBe('paid');
    expect(e.isPaidActive).toBe(false);
    expect(computeEffectiveMode(true, e.isPaidActive)).toBe('pro');
  });

  it('B7: trialing counts as Paid', () => {
    const e = rowToEntitlement(rowFromPolar({ status: 'trialing' }));
    expect(e.isPaidActive).toBe(true);
  });

  it('B8: never demote mode while entitlement load failed (keep last known)', () => {
    // shouldSyncModeFromBilling gates mode writes
    expect(shouldSyncModeFromBilling('error')).toBe(false);
    expect(shouldSyncModeFromBilling('loading')).toBe(false);
    expect(shouldSyncModeFromBilling('ready')).toBe(true);

    // On load error, snapshot preserves prior paid if already ready
    const prior = snapshotFromEntitlement(
      rowToEntitlement(rowFromPolar({ status: 'active' })),
      { loadState: 'ready' }
    );
    expect(prior.isPaidActive).toBe(true);
    // freeEntitlement alone must not be used as demotion on error path
    expect(freeEntitlement().isPaidActive).toBe(false);
  });

  it('B9: signed-out user is basic regardless of stale paid flag', () => {
    expect(computeEffectiveMode(false, true)).toBe('basic');
  });
});

// ---------------------------------------------------------------------------
// Security: threat model scenarios
// ---------------------------------------------------------------------------

describe('security: origin & redirect (open redirect / CSRF surface)', () => {
  it('S1: only exact allowlisted origins for CORS', () => {
    expect(isAllowedBillingCorsOrigin(EXT_ORIGIN, ALLOWED)).toBe(true);
    expect(isAllowedBillingCorsOrigin(WEB_ORIGIN, ALLOWED)).toBe(true);
    expect(
      isAllowedBillingCorsOrigin('chrome-extension://evil-extension-id', ALLOWED)
    ).toBe(false);
    expect(isAllowedBillingCorsOrigin('https://evil.com', ALLOWED)).toBe(false);
    expect(isAllowedBillingCorsOrigin(null, ALLOWED)).toBe(false);
  });

  it('S2: success/cancel redirect URLs cannot leave allowlist', () => {
    expect(
      isAllowedBillingRedirectUrl(
        `${WEB_ORIGIN}/settings?billing=success`,
        ALLOWED
      )
    ).toBe(true);
    expect(
      isAllowedBillingRedirectUrl('https://evil.com/phish?billing=success', ALLOWED)
    ).toBe(false);
    expect(
      isAllowedBillingRedirectUrl(
        'https://underscore-web.pages.dev.evil.com/settings',
        ALLOWED
      )
    ).toBe(false);
  });

  it('S3: rejects javascript: and data: redirect schemes', () => {
    expect(isAllowedBillingRedirectUrl('javascript:alert(1)', ALLOWED)).toBe(
      false
    );
    expect(isAllowedBillingRedirectUrl('data:text/html,x', ALLOWED)).toBe(false);
  });

  it('S4: resolveBillingRedirectUrl fails closed when client supplies evil URL', () => {
    const r = resolveBillingRedirectUrl(
      'https://evil.com/steal',
      ALLOWED,
      'success'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/Invalid/i);
    }
  });

  it('S5: extension CORS uses pinned ID, not BILLING_ALLOWED_ORIGINS string', () => {
    // WHATWG: chrome-extension://id has origin "null" — env list cannot pin it via URL.origin
    const parsed = parseBillingAllowedOrigins(`${EXT_ORIGIN}, ${WEB_ORIGIN}`);
    expect(parsed).toContain(WEB_ORIGIN);
    expect(parsed).not.toContain(EXT_ORIGIN);

    // Real gate: isAllowedBillingCorsOrigin checks BILLING_ALLOWED_EXTENSION_IDS
    expect(isAllowedBillingCorsOrigin(EXT_ORIGIN, [WEB_ORIGIN])).toBe(true);
    expect(
      isAllowedBillingCorsOrigin(
        'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        [WEB_ORIGIN]
      )
    ).toBe(false);
    // Path after extension id is not a valid Origin value clients send
    expect(EXT_ORIGIN.includes('/popup')).toBe(false);
  });
});

describe('security: product allowlist (privilege escalation / cross-product)', () => {
  it('S6: cannot grant paid without matching POLAR_PRODUCT_ID', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'active',
        allowedProductId: PRODUCT,
        eventProductId: 'other-product',
      })
    ).toEqual({ write: false, reason: 'product not allowlisted' });

    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'active',
        allowedProductId: PRODUCT,
        eventProductId: null,
      }).write
    ).toBe(false);
  });

  it('S7: other product cancel cannot demote our paid entitlement', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'canceled',
        allowedProductId: PRODUCT,
        eventProductId: 'someone-elses-product',
      })
    ).toEqual({
      write: false,
      reason: 'product not allowlisted (demote ignored)',
    });
  });

  it('S8: our product cancel demotion is allowed', () => {
    expect(
      decideWebhookEntitlementWrite({
        polarStatus: 'canceled',
        allowedProductId: PRODUCT,
        eventProductId: PRODUCT,
      })
    ).toEqual({ write: true });
  });

  it('S9: sync never falls back to any active foreign subscription', () => {
    const r = resolveBillingSyncFromSubscriptions({
      allowedProductId: PRODUCT,
      customerExists: true,
      subscriptions: [
        { id: 's_other', status: 'active', product_id: 'foreign-prod' },
      ],
    });
    expect(r.action).toBe('upsert_free');
  });

  it('S10: missing product config fail-closes to free on sync (no accidental grant)', () => {
    const r = resolveBillingSyncFromSubscriptions({
      allowedProductId: '',
      customerExists: true,
      subscriptions: [
        { id: 's1', status: 'active', product_id: PRODUCT },
      ],
    });
    expect(r).toEqual({
      action: 'upsert_free',
      reason: 'product_id_not_configured',
    });
  });
});

describe('security: checkout URL hardening', () => {
  it('S11: only polar.sh / sandbox.polar.sh https checkout hosts', () => {
    expect(assertPolarCheckoutUrl('https://polar.sh/checkout/x')).toContain(
      'polar.sh'
    );
    expect(() =>
      assertPolarCheckoutUrl('https://evil.com/checkout')
    ).toThrow();
    expect(() =>
      assertPolarCheckoutUrl('http://polar.sh/checkout')
    ).toThrow();
  });
});

describe('security: rate limits & abuse', () => {
  it('S12: checkout-style rate limit blocks after max', () => {
    const max = 5;
    const windowMs = 15 * 60 * 1000;
    let bucket = createEmptyRateBucket(0);
    for (let i = 0; i < max; i++) {
      const r = tryConsumeRateLimit(bucket, i, max, windowMs);
      expect(r.allowed).toBe(true);
      bucket = r.bucket;
    }
    expect(tryConsumeRateLimit(bucket, max, max, windowMs).allowed).toBe(false);
  });

  it('S13: focus sync debounce prevents hammering Polar', () => {
    const t0 = 1_000_000;
    expect(shouldRunFocusBillingSync(t0, t0 + 1000)).toBe(false);
    expect(shouldRunFocusBillingSync(t0, t0 + 45_000)).toBe(true);
  });
});

describe('security: dev override must not ship as free paid', () => {
  it('S14: single flag insufficient', () => {
    expect(
      isBillingDevOverrideEnabled({
        MODE: 'development',
        VITE_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(false);
  });

  it('S15: both flags blocked when PROD', () => {
    expect(
      isBillingDevOverrideEnabled({
        PROD: true,
        VITE_BILLING_DEV_OVERRIDE: 'true',
        VITE_ALLOW_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(false);
  });
});

describe('security: webhook payload hygiene', () => {
  it('S16: order.paid cannot invent subscription entitlement', () => {
    expect(
      extractPolarEntitlementSource({
        type: 'order.paid',
        data: {
          status: 'paid',
          customer: { external_id: 'user-uuid' },
        },
      })
    ).toBeNull();
  });

  it('S17: webhook without external_id cannot map to a user', () => {
    expect(
      extractPolarEntitlementSource({
        type: 'subscription.updated',
        data: {
          id: 'sub_1',
          status: 'active',
          customer: { id: 'cus_1' },
        },
      })
    ).toBeNull();
  });
});
