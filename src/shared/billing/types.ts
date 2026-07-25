/**
 * Platform-agnostic billing entitlement types.
 * Shared by web, extension, and future mobile clients.
 */

export type BillingPlan = 'free' | 'paid';

export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type BillingProvider = 'polar' | 'apple_iap' | 'google_play';

/** Row shape for public.billing_entitlements */
export interface BillingEntitlementRow {
  user_id: string;
  plan: BillingPlan;
  status: BillingStatus;
  provider: BillingProvider | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  raw_status: string | null;
  updated_at: string;
  created_at: string;
}

/** DTO returned to all clients */
export interface BillingEntitlement {
  plan: BillingPlan;
  status: BillingStatus;
  /** True when Paid features must unlock */
  isPaidActive: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: BillingProvider | null;
  manageUrlAvailable: boolean;
}

export interface CheckoutOptions {
  successUrl: string;
  cancelUrl?: string;
  customerIpAddress?: string;
}

export interface BillingUrlResult {
  url: string;
}
