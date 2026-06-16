/* eslint-disable no-restricted-syntax */
import React, { useState } from 'react';

import type { ModeDefinition } from '@/features/modes/registry';
import { modeRegistry } from '@/features/modes/registry';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export interface ModeSelectionViewProps {
  onModeSelect?: (modeId: string) => void;
  onSignInClick?: (modeId: ModeType) => void;
  onBack?: () => void;
  onNavigateToCollections?: () => void;
  initialMode?: ModeType;
  isAuthenticated?: boolean;
}

export function ModeSelectionView({
  onModeSelect,
  onSignInClick,
  onBack: _onBack,
  onNavigateToCollections,
  initialMode,
  isAuthenticated = false,
}: ModeSelectionViewProps = {}): React.ReactElement {
  const [sel, setSel] = useState<ModeType>(initialMode ?? 'local');

  const allModes = [
    modeRegistry.get('ephemeral'),
    modeRegistry.get('local'),
    modeRegistry.get('cloud'),
    modeRegistry.get('ai'),
  ].filter((m): m is ModeDefinition => m !== undefined);

  const localModes = allModes.filter((m) => m.id === 'ephemeral' || m.id === 'local');
  const cloudModes = allModes.filter((m) => m.id === 'cloud' || m.id === 'ai');

  const handleContinue = (): void => {
    const selectedMode = modeRegistry.get(sel);
    if (selectedMode?.signin && !isAuthenticated) {
      if (onSignInClick) {
        onSignInClick(sel);
      }
      return;
    }
    if (onModeSelect) {
      onModeSelect(sel);
    }
  };

  const handleLater = (): void => {
    if (onNavigateToCollections) {
      onNavigateToCollections();
    }
  };

  const activeModeDef = modeRegistry.get(sel)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--paper)' }}>
      <div style={{ padding: "20px 18px 8px" }}>
        <div className="u-kicker" style={{ marginBottom: 6 }}>Vol. 1 · Setup</div>
        <div className="u-serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Choose how <em>_underscore</em> remembers.
        </div>
        <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
          Two families. Four modes. Switchable anytime.
        </div>
      </div>
      <div className="u-rule" style={{ margin: "12px 18px 0" }} />

      <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>On this device</div>
      {localModes.map((m) => (
        <ModeRow key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id as ModeType)} />
      ))}
      <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>In the cloud</div>
      {cloudModes.map((m) => (
        <ModeRow key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id as ModeType)} />
      ))}

      <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--rule)", display: "flex", gap: 8 }}>
        <button className="btn ghost sm" style={{ flex: 1 }} onClick={handleLater}>Later</button>
        <button className="btn accent sm" style={{ flex: 2 }} onClick={handleContinue}>Continue as {activeModeDef.name} →</button>
      </div>
    </div>
  );
}

function ModeRow({ m, active, onClick }: { m: ModeDefinition; active: boolean; onClick: () => void }): React.ReactElement {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box",
      padding: "12px 18px",
      borderBottom: "1px solid var(--rule-soft)",
      background: active ? "var(--paper-2)" : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
          <span style={{ color: m.accent, fontSize: 14, lineHeight: 1 }}>{m.motif}</span>
          <div className="u-serif" style={{ fontSize: 17 }}>{m.name}</div>
          {m.signin && <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>sign-in</span>}
          {m.ttl && <span className="u-mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.14em", textTransform: "uppercase" }}>24h ttl</span>}
        </div>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
          {active ? "●" : "○"}
        </span>
      </div>
      <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic" }}>
        {m.blurb}
      </div>
    </button>
  );
}
