import React from 'react';

import { MODE_NAMES } from '../../../content/modes/mode-constants';
import { modeRegistry } from '../../../features/modes/registry';

export interface ModeHeaderProps {
  modeId?: string;
  compact?: boolean;
  onSwitch?: () => void;
  backLabel?: string;
  onBack?: () => void;
}

export function ModeHeader({ modeId = MODE_NAMES.BASIC, compact = false, onSwitch, backLabel, onBack }: ModeHeaderProps): React.ReactElement {
  const m = modeRegistry.get(modeId) || modeRegistry.get(MODE_NAMES.BASIC)!;
  
  return (
    <div style={{
      padding: compact ? "10px 16px" : "14px 16px",
      borderBottom: "1px solid var(--rule)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "var(--paper)",
      minHeight: 44,
    }}>
      {onBack ? (
        <button onClick={onBack} className="u-mono" style={{
          all: "unset", cursor: "pointer",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
          minHeight: 24, display: 'flex', alignItems: 'center'
        }}>← {backLabel || "Back"}</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: m.accent }} />
          <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)" }}>
            {m.name} · {m.family === "device" ? "on this device" : "cloud"}
          </span>
        </div>
      )}
      {onSwitch && (
        <button onClick={onSwitch} className="u-mono" style={{
          all: "unset", cursor: "pointer",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
          minHeight: 24, display: 'flex', alignItems: 'center'
        }}>Switch ›</button>
      )}
    </div>
  );
}
