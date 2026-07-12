import React from 'react';

export interface LibraryEmptyGuestProps {
  onSignIn?: () => void;
}

export function LibraryEmptyGuest({ onSignIn }: LibraryEmptyGuestProps): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: 12, border: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
        <div className="u-kicker">No highlights yet</div>
        <div className="u-serif" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
          Read anything lately? Highlight a phrase to begin — or sign in to load your cloud library.
        </div>
        {onSignIn && (
          <button type="button" className="btn accent sm" style={{ marginTop: 10 }} onClick={onSignIn}>
            Sign in
          </button>
        )}
      </div>
      <div style={{ padding: 12, border: '1px dashed var(--rule-soft)' }}>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Keyboard
        </div>
        <div className="u-serif" style={{ fontSize: 13, marginTop: 4 }}>
          Select text · press <span className="u-mono">⌘↩</span>
        </div>
      </div>
    </div>
  );
}
