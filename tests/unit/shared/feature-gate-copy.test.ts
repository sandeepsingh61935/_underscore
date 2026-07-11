import { describe, expect, it } from 'vitest';

import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';

describe('featureGateSubtitle', () => {
  it('maps capability denial to Pro upgrade copy', () => {
    expect(featureGateSubtitle('CAPABILITY_DENIED')).toBe('Available in Pro');
  });

  it('maps auth requirement to sign-in copy', () => {
    expect(featureGateSubtitle('AUTH_REQUIRED')).toBe('Sign in to use Pro features');
  });
});
