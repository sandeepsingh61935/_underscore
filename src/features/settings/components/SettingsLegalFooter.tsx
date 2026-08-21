/**
 * Privacy / Terms — open parent web app tab (never in-extension SPA routes).
 */
import React from 'react';

import { openLegalDoc, resolveLegalDocUrl } from '@/shared/auth/web-legal-urls';

export function SettingsLegalFooter(): React.ReactElement | null {
  const privacyUrl = resolveLegalDocUrl('/privacy');
  const termsUrl = resolveLegalDocUrl('/terms');
  if (!privacyUrl && !termsUrl) return null;

  return (
    <footer
      data-testid="settings-legal-footer"
      style={{
        flexShrink: 0,
        padding: '12px 16px 16px',
        borderTop: '1px solid var(--rule-soft)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {privacyUrl ? (
        <button
          type="button"
          className="u-mono"
          data-testid="settings-legal-privacy"
          onClick={() => {
            openLegalDoc('/privacy');
          }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 'var(--step--2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Privacy
        </button>
      ) : null}
      {termsUrl ? (
        <button
          type="button"
          className="u-mono"
          data-testid="settings-legal-terms"
          onClick={() => {
            openLegalDoc('/terms');
          }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 'var(--step--2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Terms
        </button>
      ) : null}
    </footer>
  );
}
