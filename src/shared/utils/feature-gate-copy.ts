/**
 * User-facing subtitles for mode feature gate denials.
 * @see docs/implementation-plans/mode-boundary/prd-basic.md
 */

import type { FeatureDenyReason } from '@/shared/utils/mode-capabilities';

export function featureGateSubtitle(reason?: FeatureDenyReason): string {
  switch (reason) {
    case 'CAPABILITY_DENIED':
      return 'Available with Account (Free)';
    case 'AUTH_REQUIRED':
      return 'Sign in to use account features';
    case 'WRONG_MODE':
      return 'Available with Account (Paid)';
    case 'WRONG_SCOPE':
      return 'Available with Account (Free)';
    default:
      return 'Unavailable in this mode';
  }
}

/** Machine-readable codes for MCP / bridge denials. */
export function featureGateErrorCode(reason?: FeatureDenyReason): string {
  switch (reason) {
    case 'AUTH_REQUIRED':
      return 'AUTH_REQUIRED';
    case 'WRONG_MODE':
    case 'CAPABILITY_DENIED':
      return 'AI_NOT_ENABLED';
    default:
      return 'FEATURE_DENIED';
  }
}
