import React from 'react';

import { libraryEmptyGuestCopy } from '@/shared/copy/product-surface-copy';

export interface LibraryEmptyGuestProps {
  onSignIn?: () => void;
}

export function LibraryEmptyGuest({ onSignIn }: LibraryEmptyGuestProps): React.ReactElement {
  const copy = libraryEmptyGuestCopy();
  return (
    <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: 12, border: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
        <div className="u-kicker">{copy.title}</div>
        <div className="u-serif" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
          {copy.body}
        </div>
        {onSignIn && (
          <button type="button" className="btn accent sm" style={{ marginTop: 10 }} onClick={onSignIn}>
            {copy.signInLabel}
          </button>
        )}
      </div>
      <div style={{ padding: 12, border: '1px dashed var(--rule-soft)' }}>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Keyboard
        </div>
        <div className="u-serif" style={{ fontSize: 13, marginTop: 4 }}>
          {copy.keyboardHint}
        </div>
      </div>
    </div>
  );
}
