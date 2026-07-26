import { describe, expect, it } from 'vitest';
import { isBillingDevOverrideEnabled } from '@/shared/billing/dev-override';

describe('isBillingDevOverrideEnabled', () => {
  it('is false when override flag missing', () => {
    expect(
      isBillingDevOverrideEnabled({
        VITE_ALLOW_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(false);
  });

  it('is false when allow flag missing (WXT mode always development)', () => {
    expect(
      isBillingDevOverrideEnabled({
        MODE: 'development',
        VITE_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(false);
  });

  it('is false in production even with both flags', () => {
    expect(
      isBillingDevOverrideEnabled({
        PROD: true,
        MODE: 'production',
        VITE_BILLING_DEV_OVERRIDE: 'true',
        VITE_ALLOW_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(false);
  });

  it('is true only with both QA flags and non-production', () => {
    expect(
      isBillingDevOverrideEnabled({
        MODE: 'development',
        VITE_BILLING_DEV_OVERRIDE: 'true',
        VITE_ALLOW_BILLING_DEV_OVERRIDE: 'true',
      })
    ).toBe(true);
  });
});
