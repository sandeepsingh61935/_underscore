/**
 * Fail-closed product allowlist for Polar webhook entitlement writes (S-2).
 * Pure — unit-tested; Edge keeps a synced copy for Deno deploy.
 */

import { mapPolarSubscriptionStatus } from './polar-map';

export type WebhookWriteDecision =
  | { write: true }
  | { write: false; reason: string };

/**
 * Whether to upsert billing_entitlements from this webhook event.
 *
 * Grant path (active / trialing / past_due): require configured allowlist product
 * and exact product match. Missing product id → skip (fail closed).
 *
 * Demote path (canceled, unpaid, …): allow without product id; if product is
 * present and not allowlisted, skip so other products do not clear paid.
 */
export function decideWebhookEntitlementWrite(input: {
  polarStatus: string;
  allowedProductId: string | null | undefined;
  eventProductId: string | null | undefined;
}): WebhookWriteDecision {
  const status = mapPolarSubscriptionStatus(input.polarStatus);
  const isGrant =
    status === 'active' || status === 'trialing' || status === 'past_due';

  const allowed =
    typeof input.allowedProductId === 'string' && input.allowedProductId.trim()
      ? input.allowedProductId.trim()
      : null;
  const eventProduct =
    typeof input.eventProductId === 'string' && input.eventProductId.trim()
      ? input.eventProductId.trim()
      : null;

  if (isGrant) {
    if (!allowed) {
      return {
        write: false,
        reason: 'POLAR_PRODUCT_ID not configured',
      };
    }
    if (!eventProduct) {
      return {
        write: false,
        reason: 'product_id missing on grant event',
      };
    }
    if (eventProduct !== allowed) {
      return {
        write: false,
        reason: 'product not allowlisted',
      };
    }
    return { write: true };
  }

  // Demotion / non-grant
  if (eventProduct && allowed && eventProduct !== allowed) {
    return {
      write: false,
      reason: 'product not allowlisted (demote ignored)',
    };
  }
  return { write: true };
}

/** Best-effort product id extraction from Polar webhook payloads. */
export function extractPolarProductId(event: {
  data?: Record<string, unknown> | null;
}): string | null {
  const data = event.data;
  if (!data || typeof data !== 'object') return null;

  if (typeof data['product_id'] === 'string') return data['product_id'];

  const product = data['product'];
  if (product && typeof product === 'object') {
    const id = (product as Record<string, unknown>)['id'];
    if (typeof id === 'string') return id;
  }

  const items = data['items'];
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0] as Record<string, unknown>;
    if (typeof first['product_id'] === 'string') return first['product_id'];
    const nested = first['product'];
    if (nested && typeof nested === 'object') {
      const id = (nested as Record<string, unknown>)['id'];
      if (typeof id === 'string') return id;
    }
  }

  return null;
}
