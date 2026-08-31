import React from 'react';

export interface BasicResetProps {
  onSwitchMode?: () => void;
  onStartCapturing?: () => void;
}

/** @deprecated Renamed to reflect the Basic mode consolidation; kept for import compatibility. */
export type EphemeralResetProps = BasicResetProps;

export function BasicReset({
  onSwitchMode,
  onStartCapturing,
}: BasicResetProps): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        padding: '24px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        justifyContent: 'center',
      }}
    >
      <div
        className="u-serif"
        style={{ fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.1 }}
      >
        A fresh start.
      </div>
      <div
        className="u-serif"
        style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}
      >
        Guest mode keeps your captures permanently on this device. Nothing yet — highlight
        text on any page to begin.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className="btn sm"
          style={{ flex: 1 }}
          onClick={onSwitchMode}
        >
          Switch mode
        </button>
        <button
          type="button"
          className="btn accent sm"
          style={{ flex: 1 }}
          onClick={onStartCapturing}
        >
          Start capturing
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use BasicReset. Kept for import compatibility. */
export const EphemeralReset = BasicReset;
