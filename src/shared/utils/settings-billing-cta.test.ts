import { describe, expect, it } from 'vitest';
import { resolveSettingsBillingCta } from './settings-billing-cta';

describe('resolveSettingsBillingCta', () => {
  it('Free: Upgrade → checkout, shows Refresh', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: false,
      status: 'none',
    });
    expect(cta.kind).toBe('upgrade');
    expect(cta.title).toBe('Upgrade to Paid');
    expect(cta.ctaLabel).toBe('Upgrade');
    expect(cta.action).toBe('checkout');
    expect(cta.showSync).toBe(true);
    expect(cta.sub).toBe('Agent access (Integrations) — after early access');
  });

  it('Paid active: Manage → portal, no Refresh', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'active',
    });
    expect(cta.kind).toBe('manage');
    expect(cta.title).toBe('Billing');
    expect(cta.ctaLabel).toBe('Manage');
    expect(cta.action).toBe('portal');
    expect(cta.showSync).toBe(false);
    expect(cta.sub).toBe('Invoices & payment');
  });

  it('Paid with cancel scheduled: cancel-at-period-end copy', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'active',
      cancelAtPeriodEnd: true,
    });
    expect(cta.kind).toBe('manage');
    expect(cta.sub).toBe('Cancels at period end');
    expect(cta.action).toBe('portal');
  });

  it('Past due: Update → portal, shows Refresh (grace)', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: false,
      status: 'past_due',
    });
    expect(cta.kind).toBe('update_payment');
    expect(cta.title).toBe('Payment past due');
    expect(cta.ctaLabel).toBe('Update');
    expect(cta.action).toBe('portal');
    expect(cta.showSync).toBe(true);
    expect(cta.sub).toBe('Restore Paid access');
  });

  it('Past due wins over isPaidActive if status is past_due', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'past_due',
    });
    expect(cta.kind).toBe('update_payment');
    expect(cta.action).toBe('portal');
  });

  it('trialing paid-active uses Manage, not Upgrade', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'trialing',
    });
    expect(cta.kind).toBe('manage');
    expect(cta.action).toBe('portal');
  });
});
