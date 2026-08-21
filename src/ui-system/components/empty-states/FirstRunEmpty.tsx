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
  onSignIn,
}: FirstRunEmptyProps): React.ReactElement {
  const copy = homeFirstRunCopy({ guest });
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        minHeight: '100%',
        gap: 10,
        boxSizing: 'border-box',
      }}
    >
      <p
        className="u-serif"
        style={{
          fontSize: 'var(--step-3)',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {copy.title}
      </p>
      <p
        style={{
          fontSize: 'var(--step--1)',
          color: 'var(--ink-3)',
          lineHeight: 1.45,
          maxWidth: '28ch',
          margin: 0,
        }}
      >
        {copy.body}
      </p>
      {guest && onSignIn && copy.signInLabel ? (
        <button
          type="button"
          onClick={onSignIn}
          className="u-mono"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            marginTop: 6,
            minHeight: 32,
            fontSize: 'var(--step--2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {copy.signInLabel}
        </button>
      ) : null}
    </div>
  );
}
