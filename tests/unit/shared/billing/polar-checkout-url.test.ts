import { describe, expect, it } from 'vitest';
import { assertPolarCheckoutUrl } from '@/shared/billing/polar-checkout-url';

describe('assertPolarCheckoutUrl (WP-7)', () => {
  it('accepts polar.sh https checkout URLs', () => {
    expect(assertPolarCheckoutUrl('https://polar.sh/checkout/abc')).toBe(
      'https://polar.sh/checkout/abc'
    );
  });

  it('accepts sandbox.polar.sh', () => {
    expect(assertPolarCheckoutUrl('https://sandbox.polar.sh/checkout/x')).toContain(
      'sandbox.polar.sh'
    );
  });

  it('rejects evil host', () => {
    expect(() => assertPolarCheckoutUrl('https://evil.example/')).toThrow(/unexpected/i);
  });

  it('rejects http', () => {
    expect(() => assertPolarCheckoutUrl('http://polar.sh/checkout')).toThrow();
  });
});
