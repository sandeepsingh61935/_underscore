import { describe, expect, it } from 'vitest';

import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';

describe('featureGateSubtitle', () => {
  it('maps capability denial to Account (Free) upgrade copy', () => {
    expect(featureGateSubtitle('CAPABILITY_DENIED')).toBe('Available with Account (Free)');
  });

  it('maps auth requirement to sign-in copy', () => {
    expect(featureGateSubtitle('AUTH_REQUIRED')).toBe('Sign in to use account features');
  });

  it('maps wrong mode to Account (Paid) upgrade copy', () => {
    expect(featureGateSubtitle('WRONG_MODE')).toBe('Available with Account (Paid)');
  });

  it('maps paid-required to Account (Paid) upgrade copy', () => {
    expect(featureGateSubtitle('PAID_REQUIRED')).toBe('Available with Account (Paid)');
  });
});
