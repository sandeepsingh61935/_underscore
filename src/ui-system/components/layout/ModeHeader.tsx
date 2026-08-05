import React from 'react';

export interface ModeHeaderProps {
  /** @deprecated unused; ModeHeader is back-only chrome */
  modeId?: string;
  /** @deprecated unused; ModeHeader is back-only chrome */
  compact?: boolean;
  /** @deprecated Switch removed from ModeHeader */
  onSwitch?: () => void;
  backLabel?: string;
  onBack?: () => void;
}

/**
 * Back-only chrome row for nested popup views.
 * Returns null when there is no onBack (root tabs must not waste header space).
 */
export function ModeHeader({
  backLabel,
  onBack,
}: ModeHeaderProps): React.ReactElement | null {
  if (!onBack) {
    return null;
  }

  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--paper)',
        minHeight: 44,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="u-mono"
        style={{
          all: 'unset',
          cursor: 'pointer',
          fontSize: 'var(--step--2)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ← {backLabel || 'Back'}
      </button>
    </div>
  );
}
