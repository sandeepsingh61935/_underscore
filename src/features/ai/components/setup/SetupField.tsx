import React from 'react';

export interface SetupFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export function SetupField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  autoComplete,
}: SetupFieldProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <label className="u-kicker" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          minHeight: 44,
          padding: '0 10px',
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontFamily: 'var(--sans)',
          fontSize: 'var(--step-0)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
