import React from 'react';

export interface EphemeralResetProps {
  onSwitchMode?: () => void;
  onStartCapturing?: () => void;
}

export function EphemeralReset({ onSwitchMode, onStartCapturing }: EphemeralResetProps): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
      <div className="u-serif" style={{ fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        A fresh 24&#8202;hours.
      </div>
      <div className="u-serif" style={{ fontSize: 14, color: "var(--ink-3)", fontStyle: "italic" }}>
        Ephemeral mode keeps today's captures for a day. Nothing yet — whatever you save now will expire by this time tomorrow.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn sm" style={{ flex: 1 }} onClick={onSwitchMode}>Switch mode</button>
        <button className="btn accent sm" style={{ flex: 1 }} onClick={onStartCapturing}>Start capturing</button>
      </div>
    </div>
  );
}
