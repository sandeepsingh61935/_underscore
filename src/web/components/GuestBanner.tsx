import React from 'react';
import { Link } from 'react-router-dom';

export interface GuestBannerProps {
  /** Optional override for the sign-in destination. Default /sign-in. */
  signInTo?: string;
}

/**
 * Guest-mode notice used on product pages (e.g. Home).
 * Sign-in CTA only — no prototype design controls.
 */
export function GuestBanner({
  signInTo = '/sign-in',
}: GuestBannerProps): React.ReactElement {
  return (
    <div className="banner" data-od-id="guest-banner">
      <div style={{ flex: 1, minWidth: 0 }} data-od-id="guest-passive">
        Local only — sync, export, and Chat after sign-in.
      </div>
      <Link to={signInTo} className="btn sm">
        Sign in
      </Link>
    </div>
  );
}
