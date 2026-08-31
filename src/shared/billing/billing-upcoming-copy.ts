/**
 * User-facing billing stub while checkout/portal stay code-only (not exposed in UI).
 * Billing modules remain; Settings shows Upcoming only.
 */

export const BILLING_UPCOMING_TITLE = 'Billing';

export const BILLING_UPCOMING_SUB = 'Upcoming — available in a few months.';

export type BillingUpcomingCopy = {
  title: string;
  sub: string;
};

export function billingUpcomingCopy(): BillingUpcomingCopy {
  return {
    title: BILLING_UPCOMING_TITLE,
    sub: BILLING_UPCOMING_SUB,
  };
}
