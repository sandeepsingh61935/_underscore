import React from 'react';

import { homeFirstRunCopy } from '@/shared/copy/product-surface-copy';

export interface FirstRunEmptyProps {
  /** Guest local storage vs signed-in library. */
  guest?: boolean;
  onSignIn?: () => void;
}

/**
 * Calm first-run empty for Home (v3 mock: No highlights yet).
 * Body-only; parent supplies optional Sign in CTA via onSignIn.
 */
export function FirstRunEmpty({
  guest = true,
}: FirstRunEmptyProps): React.ReactElement {
  const copy = homeFirstRunCopy({ guest });
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        minHeight: '100%',
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'var(--step-2)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {copy.title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'var(--step-0)',
          color: 'var(--ink-3)',
          lineHeight: 1.45,
          maxWidth: '32ch',
          margin: 0,
        }}
      >
        {copy.body}
      </p>
    </div>
  );
}
