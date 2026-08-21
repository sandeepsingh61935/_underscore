/**
 * Mode segments — Guest | Account only.
 * Paid is not a mode chip (billing Upcoming; entitlement stays code-side).
 */
import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export type SettingsIdentitySeg = 'guest' | 'account';

export interface SettingsModeSegProps {
  currentMode: ModeType;
  isAuthenticated: boolean;
  /** @deprecated Paid is not shown as a mode; kept for call-site compatibility. */
  isPaidActive?: boolean;
  onSelectGuest: () => void;
  onSelectAccount: () => void;
  /** @deprecated Use onSelectAccount */
  onSelectFree?: () => void;
  /** @deprecated Paid mode chip removed */
  onSelectPaid?: () => void;
}

function resolveActive(
  currentMode: ModeType,
  isAuthenticated: boolean,
): SettingsIdentitySeg {
  if (!isAuthenticated || currentMode === 'basic') return 'guest';
  return 'account';
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
  onSelectGuest,
  onSelectAccount,
  onSelectFree,
}: SettingsModeSegProps): React.ReactElement {
  const active = resolveActive(currentMode, isAuthenticated);
  const selectAccount = onSelectAccount ?? onSelectFree ?? (() => undefined);

  const options: Array<{
    id: SettingsIdentitySeg;
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
      id: 'account',
      label: 'Account',
      gated: false,
      onSelect: selectAccount,
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
        Mode
      </div>
      <div
        className="seg"
        role="radiogroup"
        aria-label="Mode"
        data-testid="settings-mode-seg"
      >
        {options.map((opt) => {
          const isActive = active === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={opt.label}
              className={`${isActive ? 'active' : ''} ${opt.gated && !isActive ? 'gated' : ''}`}
              data-testid={`settings-mode-${opt.id}`}
              onClick={() => {
                if (isActive) return;
                opt.onSelect();
              }}
            >
              <span>{opt.label}</span>
              {opt.gated && !isActive ? <LockGlyph /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
