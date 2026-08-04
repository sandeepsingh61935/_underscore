import { describe, expect, it } from 'vitest';
import { resolveSettingsBillingCta } from './settings-billing-cta';

describe('resolveSettingsBillingCta', () => {
  it('Free: Upgrade → checkout, shows Sync', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: false,
      status: 'none',
    });
    expect(cta.kind).toBe('upgrade');
    expect(cta.title).toBe('Upgrade to Account (Paid)');
    expect(cta.ctaLabel).toBe('Upgrade');
    expect(cta.action).toBe('checkout');
    expect(cta.showSync).toBe(true);
    expect(cta.sub).toMatch(/Polar/);
  });

  it('Paid active: Manage → portal, no Sync', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'active',
    });
    expect(cta.kind).toBe('manage');
    expect(cta.title).toBe('Manage billing');
    expect(cta.ctaLabel).toBe('Portal');
    expect(cta.action).toBe('portal');
    expect(cta.showSync).toBe(false);
    expect(cta.sub).toBe('Invoices, payment method, cancel');
  });

  it('Paid with cancel scheduled: cancel-at-period-end copy', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: true,
      status: 'active',
      cancelAtPeriodEnd: true,
    });
    expect(cta.kind).toBe('manage');
    expect(cta.sub).toBe('Cancels at period end · invoices & payment method');
    expect(cta.action).toBe('portal');
  });

  it('Past due: Update payment → portal, shows Sync (grace)', () => {
    const cta = resolveSettingsBillingCta({
      isPaidActive: false,
      status: 'past_due',
    });
    expect(cta.kind).toBe('update_payment');
    expect(cta.title).toBe('Payment past due');
    expect(cta.ctaLabel).toBe('Update payment');
    expect(cta.action).toBe('portal');
    expect(cta.showSync).toBe(true);
    expect(cta.sub).toMatch(/Update payment/);
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
