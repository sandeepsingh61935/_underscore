/**
 * Mode plan segments for Settings — Open Design .seg pattern.
 * Labels: Guest · Free · Paid (production branding, not Starter/Pro toys).
 */
import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export type SettingsPlanSeg = 'guest' | 'free' | 'paid';

export interface SettingsModeSegProps {
  currentMode: ModeType;
  isAuthenticated: boolean;
  isPaidActive: boolean;
  onSelectGuest: () => void;
  onSelectFree: () => void;
  onSelectPaid: () => void;
}

function resolveActive(
  currentMode: ModeType,
  isAuthenticated: boolean,
  isPaidActive: boolean,
): SettingsPlanSeg {
  if (!isAuthenticated || currentMode === 'basic') return 'guest';
  if (currentMode === 'pro_xai' && isPaidActive) return 'paid';
  return 'free';
}

function LockGlyph(): React.ReactElement {
  return (
    <svg
      className="seg-lock"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
      <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
    </svg>
  );
}

export function SettingsModeSeg({
  currentMode,
  isAuthenticated,
  isPaidActive,
  onSelectGuest,
  onSelectFree,
  onSelectPaid,
}: SettingsModeSegProps): React.ReactElement {
  const active = resolveActive(currentMode, isAuthenticated, isPaidActive);

  const options: Array<{
    id: SettingsPlanSeg;
    label: string;
    gated: boolean;
    onSelect: () => void;
  }> = [
    {
      id: 'guest',
      label: 'Guest',
      gated: false,
      onSelect: onSelectGuest,
    },
    {
      id: 'free',
      label: 'Free',
      gated: !isAuthenticated,
      onSelect: onSelectFree,
    },
    {
      id: 'paid',
      label: 'Paid',
      gated: !isAuthenticated || !isPaidActive,
      onSelect: onSelectPaid,
    },
  ];

  return (
    <section
      className="mode-section"
      data-testid="settings-section-mode"
      style={{ padding: '8px 16px 12px' }}
    >
      <div
        className="u-caps"
        style={{ color: 'var(--ink-3)', marginBottom: 8 }}
      >
        Plan
      </div>
      <div className="seg" role="radiogroup" aria-label="Plan" data-testid="settings-mode-seg">
        {options.map((opt) => {
          const isActive = active === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={
                opt.gated && !isActive
                  ? `${opt.label}, requires account`
                  : opt.label
              }
              className={`${isActive ? 'active' : ''} ${opt.gated && !isActive ? 'gated' : ''}`}
              data-testid={`settings-mode-${opt.id}`}
              onClick={() => {
                if (isActive) return;
                opt.onSelect();
              }}
            >
              {opt.label}
              {opt.gated && !isActive ? <LockGlyph /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
