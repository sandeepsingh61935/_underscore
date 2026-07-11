/**
 * User-facing subtitles for mode feature gate denials.
 * @see docs/implementation-plans/mode-boundary/prd-basic.md
 */

import type { FeatureDenyReason } from '@/shared/utils/mode-capabilities';

export function featureGateSubtitle(reason?: FeatureDenyReason): string {
  switch (reason) {
    case 'CAPABILITY_DENIED':
      return 'Available in Pro';
    case 'AUTH_REQUIRED':
      return 'Sign in to use Pro features';
    case 'VAULT_LOCKED':
      return 'Unlock vault in Settings first';
    case 'WRONG_MODE':
      return 'Available in 10x-Pro';
    case 'WRONG_SCOPE':
      return 'Available in Pro';
    default:
      return 'Unavailable in this mode';
  }
}
