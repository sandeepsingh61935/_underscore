import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';

export interface AuthLandingChromeProps {
  /** Page label in the strip (e.g. "Sign in"). */
  pageLabel?: string;
  /** Mode status on the right (e.g. "Create account" | "Welcome back"). */
  modeStatus: string;
  /** Optional surface tag for tests/debug (hidden from visual hierarchy). */
  surfaceLabel?: 'web' | 'popup';
}

/**
 * Slim web auth landing chrome — brand · page · mode-status.
 * Popup uses PopupShell for chrome; do not mount this inside AuthView.
 */
export function AuthLandingChrome({
  pageLabel = 'Sign in',
  modeStatus,
  surfaceLabel = 'web',
}: AuthLandingChromeProps): React.ReactElement {
  return (
    <header
      data-testid="auth-landing-chrome"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 16px',
        borderBottom: '1px solid var(--rule-soft)',
        background: 'var(--paper-2)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Logo size="sm" showText={false} />
        <span
          className="u-serif"
          style={{
            fontSize: 'var(--step-0)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          underscore
        </span>
        <span
          className="u-mono"
          style={{
            fontSize: 'var(--step--2)',
            color: 'var(--ink-4)',
            letterSpacing: '0.04em',
          }}
        >
          {surfaceLabel}
        </span>
      </div>
      <span
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
        }}
      >
        {pageLabel}
      </span>
      <span
        className="u-sans"
        style={{
          fontSize: 'var(--step--2)',
          letterSpacing: '0.04em',
          color: 'var(--ink-3)',
          textAlign: 'right',
        }}
      >
        {modeStatus}
      </span>
    </header>
  );
}
