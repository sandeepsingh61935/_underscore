import React from 'react';

export type SettingsStatusGlyphKind = 'lock' | 'chevron';

export interface SettingsStatusGlyphProps {
  kind: SettingsStatusGlyphKind;
  /** Accessible name (e.g. Locked / Open). */
  label: string;
}

/**
 * Trailing status affordance for Settings list rows.
 * Visual: lock or chevron only — words stay in aria-label/title.
 */
export function SettingsStatusGlyph({
  kind,
  label,
}: SettingsStatusGlyphProps): React.ReactElement {
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
        minWidth: 28,
        minHeight: 28,
        color: 'var(--ink-3)',
      }}
    >
      {kind === 'lock' ? <LockGlyph /> : <ChevronGlyph />}
    </span>
  );
}

function LockGlyph(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="7"
        width="9"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronGlyph(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
