/**
 * Platform-agnostic billing types.
 * Shared by web, extension, edge (conceptually), and future mobile.
 */

export type BillingPlan = 'free' | 'paid';

export type BillingStatus =
  'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export type BillingProvider = 'polar' | 'apple_iap' | 'google_play';

/** How we loaded the entitlement — never treat load failure as free for demotion. */
export type EntitlementLoadState = 'idle' | 'loading' | 'ready' | 'error';

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

/** DTO for a known entitlement row (or synthetic free when ready + no row). */
export interface BillingEntitlement {
  plan: BillingPlan;
  status: BillingStatus;
  /** True only when plan is paid and status is active/trialing */
  isPaidActive: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: BillingProvider | null;
  manageUrlAvailable: boolean;
}

/**
 * Full client snapshot. Mode projection must only demote/promote when loadState === 'ready'.
 */
export interface BillingSnapshot {
  loadState: EntitlementLoadState;
  entitlement: BillingEntitlement;
  error: string | null;
  /**
   * Effective paid flag for product gates.
   * true only when loadState is ready and entitlement.isPaidActive (or dev override applied by provider).
   */
  isPaidActive: boolean;
}

export interface CheckoutOptions {
  successUrl: string;
  cancelUrl?: string;
  customerIpAddress?: string;
}

export interface BillingUrlResult {
  url: string;
}

/** Transport for platform-agnostic billing actions. */
export interface IBillingPort {
  getEntitlement(): Promise<BillingEntitlement>;
  createCheckout(options: CheckoutOptions): Promise<BillingUrlResult>;
  createPortal(): Promise<BillingUrlResult>;
  /** Optional: pull Polar state into DB (web after checkout success). */
  syncFromPolar?(): Promise<{ plan: string; status?: string }>;
}
