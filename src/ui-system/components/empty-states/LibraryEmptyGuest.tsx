import React from 'react';

import { libraryEmptyGuestCopy } from '@/shared/copy/product-surface-copy';

export interface LibraryEmptyGuestProps {
  onSignIn?: () => void;
}

export function LibraryEmptyGuest({ onSignIn }: LibraryEmptyGuestProps): React.ReactElement {
  const copy = libraryEmptyGuestCopy();
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
        gap: 8,
        minHeight: 320,
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
      {onSignIn && (
        <button
          type="button"
          className="btn accent sm"
          style={{ marginTop: 14 }}
          onClick={onSignIn}
        >
          {copy.signInLabel}
        </button>
      )}
    </div>
  );
}
