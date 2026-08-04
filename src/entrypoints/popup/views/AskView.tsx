import React from 'react';

export interface AskViewProps {
  lockReason?: 'guest' | 'free' | 'past_due' | 'no_model' | null;
  onSignIn?: () => void;
  onUpgrade?: () => void;
  onUpdatePayment?: () => void;
  onConnectAi?: () => void;
}

/**
 * Ask tab body. Full lock variants land in a later task; guest placeholder is enough for routing.
 * Body-only: PopupShell owns chrome (ModeHeader + TabBar).
 */
export function AskView({
  lockReason = 'guest',
  onSignIn,
}: AskViewProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '16px',
      }}
    >
      <div className="u-serif" style={{ fontSize: 'var(--step-1)', color: 'var(--ink)' }}>
        Ask
      </div>
      {lockReason === 'guest' && (
        <>
          <p
            className="u-sans"
            style={{ color: 'var(--ink-2)', fontSize: 'var(--step-0)', marginTop: 8 }}
          >
            Sign in to use Ask on your library.
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="btn u-mono"
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            >
              Sign in
            </button>
          )}
        </>
      )}
    </div>
  );
}
