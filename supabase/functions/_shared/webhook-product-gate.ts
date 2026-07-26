/**
 * Keep in sync with src/shared/billing/webhook-product-gate.ts (unit-tested there).
 */

function mapPolarSubscriptionStatus(polarStatus: string | null | undefined): string {
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

export type WebhookWriteDecision =
  | { write: true }
  | { write: false; reason: string };

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
      return { write: false, reason: 'POLAR_PRODUCT_ID not configured' };
    }
    if (!eventProduct) {
      return { write: false, reason: 'product_id missing on grant event' };
    }
    if (eventProduct !== allowed) {
      return { write: false, reason: 'product not allowlisted' };
    }
    return { write: true };
  }

  if (eventProduct && allowed && eventProduct !== allowed) {
    return {
      write: false,
      reason: 'product not allowlisted (demote ignored)',
    };
  }
  return { write: true };
}

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
