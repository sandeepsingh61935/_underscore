/**
 * Pure Settings billing CTA matrix — Free / Paid / Past due / cancel-scheduled.
 * Commercial action is checkout (Upgrade) or portal (Manage / Update payment).
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
  /** Accent mono trailing label — one commercial CTA */
  ctaLabel: string;
  action: SettingsBillingAction;
  /** Sync recovers after checkout / lagging webhook (not paid-active) */
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
      sub: 'Update payment method in Polar to restore Account (Paid)',
      ctaLabel: 'Update payment',
      action: 'portal',
      showSync: true,
    };
  }

  if (input.isPaidActive) {
    return {
      kind: 'manage',
      title: 'Manage billing',
      sub: cancelAtPeriodEnd
        ? 'Cancels at period end · invoices & payment method'
        : 'Invoices, payment method, cancel',
      ctaLabel: 'Portal',
      action: 'portal',
      showSync: false,
    };
  }

  return {
    kind: 'upgrade',
    title: 'Upgrade to Account (Paid)',
    sub: 'AI + agent connections · billed via Polar',
    ctaLabel: 'Upgrade',
    action: 'checkout',
    showSync: true,
  };
}
