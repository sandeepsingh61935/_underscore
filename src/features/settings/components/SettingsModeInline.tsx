/**
 * Inline Free/Paid mode expander for Settings (mode-in-settings pattern).
 * Free → setMode('pro'). Paid when not entitled → billing upgrade, not mode write.
 */
import React, { useState } from 'react';

import { getModeBranding } from '@/shared/constants/mode-branding';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { BtnText } from '@/ui-system/components/primitives/BtnText';
import { Row } from '@/ui-system/components/primitives/Row';

export interface SettingsModeInlineProps {
  currentMode: ModeType;
  isAuthenticated: boolean;
  isPaidActive: boolean;
  onSelectFree: () => void;
  /** Upgrade / portal path when user picks Paid without entitlement. */
  onSelectPaidUpgrade: () => void;
}

export function SettingsModeInline({
  currentMode,
  isAuthenticated,
  isPaidActive,
  onSelectFree,
  onSelectPaidUpgrade,
}: SettingsModeInlineProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const branding = getModeBranding(currentMode);

  if (!isAuthenticated) {
    return (
      <Row
        title="Mode"
        sub="Guest · local only"
        right={
          <span
            className="u-mono"
            style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}
          >
            Local
          </span>
        }
      />
    );
  }

  const freeActive =
    currentMode === 'pro' || (currentMode === 'pro_xai' && !isPaidActive);
  const paidActive = currentMode === 'pro_xai' && isPaidActive;

  return (
    <>
      <Row
        title="Mode"
        sub={`${branding.displayName} · ${branding.tagline.toLowerCase()}`}
        right={
          <BtnText
            accent={open}
            aria-expanded={open}
            aria-controls="settings-mode-panel"
            data-testid="settings-mode-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Change'}
          </BtnText>
        }
      />
      {open ? (
        <div
          id="settings-mode-panel"
          data-testid="settings-mode-panel"
          style={{
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--rule-soft)',
          }}
        >
          <div
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--ink-4)',
              padding: '10px 16px 4px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Signed-in plans
          </div>
          <ModeOption
            title="Account (Free)"
            description={getModeBranding('pro').description}
            active={freeActive && !paidActive}
            pill="Free"
            actionLabel={freeActive && !paidActive ? 'Active' : 'Use Free'}
            onAction={() => {
              if (!(freeActive && !paidActive)) onSelectFree();
              setOpen(false);
            }}
            disabled={freeActive && !paidActive}
          />
          <ModeOption
            title="Account (Paid)"
            description={getModeBranding('pro_xai').description}
            active={paidActive}
            pill="Paid"
            actionLabel={paidActive ? 'Active' : 'Upgrade'}
            accentAction={!paidActive}
            onAction={() => {
              if (paidActive) {
                setOpen(false);
                return;
              }
              onSelectPaidUpgrade();
              setOpen(false);
            }}
            disabled={paidActive}
          />
          <div
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--ink-4)',
              padding: '8px 16px 12px',
              letterSpacing: '0.06em',
            }}
          >
            Guest is only available when signed out
          </div>
        </div>
      ) : null}
    </>
  );
}

interface ModeOptionProps {
  title: string;
  description: string;
  active: boolean;
  pill: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  accentAction?: boolean;
}

function ModeOption({
  title,
  description,
  active,
  pill,
  actionLabel,
  onAction,
  disabled = false,
  accentAction = false,
}: ModeOptionProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid var(--rule-soft)',
        background: active ? 'var(--utility-overlay-06)' : 'transparent',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}
        >
          <div
            style={{
              fontSize: 'var(--step-0)',
              fontWeight: 500,
              color: active ? 'var(--ink)' : 'var(--ink-2)',
            }}
          >
            {title}
          </div>
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              padding: '2px 8px',
              border: '1px solid var(--rule-soft)',
              color: pill === 'Paid' ? 'var(--accent)' : 'var(--ink-3)',
            }}
          >
            {pill}
          </span>
        </div>
        <div
          className="u-serif"
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
            marginTop: 4,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      <BtnText
        accent={accentAction || active}
        muted={disabled}
        disabled={disabled}
        onClick={onAction}
        aria-label={`${actionLabel}: ${title}`}
      >
        {actionLabel}
      </BtnText>
    </div>
  );
}
