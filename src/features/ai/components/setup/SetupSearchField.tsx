import React from 'react';

export interface SetupSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/** Placeholder-only search field — no "Find" prefix, no icon adornment. */
export function SetupSearchField({
  value,
  onChange,
  placeholder = 'Search models…',
  disabled = false,
  ariaLabel = 'Search models',
}: SetupSearchFieldProps): React.ReactElement {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      style={{
        minHeight: 40,
        padding: '0 10px',
        border: '1px solid var(--rule-soft)',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--sans)',
        fontSize: 'var(--step-0)',
        width: '100%',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  );
}
