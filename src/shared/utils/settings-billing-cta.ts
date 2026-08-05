/**
 * Pure Settings billing CTA matrix — Free / Paid / Past due / cancel-scheduled.
 * Commercial action is checkout (Upgrade) or portal (Manage / Update).
 * Labels use product language — never "Portal" (implementation detail).
 */

import type { BillingStatus } from '@/shared/billing';

export type SettingsBillingAction = 'checkout' | 'portal';

export type SettingsBillingCtaKind = 'upgrade' | 'manage' | 'update_payment';

export interface SettingsBillingCta {
  kind: SettingsBillingCtaKind;
  /** Row title */
  title: string;
  /** Default subtitle when no error is shown */
  sub: string;
  /** Trailing CTA label — one commercial action */
  ctaLabel: string;
  action: SettingsBillingAction;
  /** Refresh recovers after checkout / lagging webhook (not paid-active) */
  showSync: boolean;
}

export function resolveSettingsBillingCta(input: {
  isPaidActive: boolean;
  status: BillingStatus | string | null | undefined;
  cancelAtPeriodEnd?: boolean;
}): SettingsBillingCta {
  const status = input.status ?? 'none';
  const cancelAtPeriodEnd = Boolean(input.cancelAtPeriodEnd);

  if (status === 'past_due') {
    return {
      kind: 'update_payment',
      title: 'Payment past due',
      sub: 'Restore Paid access',
      ctaLabel: 'Update',
      action: 'portal',
      showSync: true,
    };
  }

  if (input.isPaidActive) {
    return {
      kind: 'manage',
      title: 'Billing',
      sub: cancelAtPeriodEnd
        ? 'Cancels at period end'
        : 'Invoices & payment',
      ctaLabel: 'Manage',
      action: 'portal',
      showSync: false,
    };
  }

  return {
    kind: 'upgrade',
    title: 'Upgrade to Paid',
    sub: 'AI & agents',
    ctaLabel: 'Upgrade',
    action: 'checkout',
    showSync: true,
  };
}
