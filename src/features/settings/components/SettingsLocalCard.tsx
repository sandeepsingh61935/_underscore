/**
 * Guest local-status card — Open Design Settings mockup.
 * Sign in for sync/export; Free path via Starter CTA → sign-in.
 */
import React from 'react';

export interface SettingsLocalCardProps {
  onSignIn?: () => void;
  /** Start Free/account path (sign-in with free intent). */
  onChooseFree?: () => void;
}

export function SettingsLocalCard({
  onSignIn,
  // onChooseFree kept for callers but prototype has single Sign in button only
  onChooseFree: _onChooseFree,
}: SettingsLocalCardProps): React.ReactElement {
  return (
    <div
      className="local-status-card"
      data-testid="settings-local-card"
      role="region"
      aria-label="Sync status"
    >
      <div className="ls-title">Back up your highlights</div>
      <div className="ls-body">Sign in to sync across devices and enable export.</div>
      <div className="ls-actions">
        <button
          type="button"
          className="btn accent sm"
          data-testid="settings-local-signin"
          data-od-id="settings-local-signin"
          aria-label="Sign in"
          onClick={() => onSignIn?.()}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
