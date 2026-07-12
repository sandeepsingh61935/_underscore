import React, { useId, useState, type ReactNode } from 'react';

export interface SectionValueColumnsProps {
  values: string[];
}

export function SectionValueColumns({ values }: SectionValueColumnsProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`,
        gap: 6,
        flex: 1,
        minWidth: 0,
        width: '100%',
        maxWidth: 260,
      }}
    >
      {values.map((value, i) => (
        <span
          key={`${value}-${i}`}
          title={value}
          className="u-mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {value}
        </span>
      ))}
    </div>
  );
}

export interface EditableControlRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  inputWidth?: number;
}

export function EditableControlRow({
  label,
  value,
  onChange,
  hint,
  inputWidth = 72,
}: EditableControlRowProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      <span className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-2)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {hint ? (
          <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {hint}
          </span>
        ) : null}
        <input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="u-mono"
          style={{
            width: inputWidth,
            padding: '4px 8px',
            border: '1px solid var(--rule)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 11,
            boxSizing: 'border-box',
            minHeight: 32,
          }}
        />
      </div>
    </div>
  );
}

export interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  trailing,
  defaultOpen = false,
}: CollapsibleSectionProps): React.ReactElement {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--rule-soft)' }}>
      <button
        type="button"
        className="u-sans"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 40,
        }}
      >
        <span
          className="u-mono"
          aria-hidden
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms ease',
            width: 10,
          }}
        >
          ›
        </span>
        <span style={{ fontSize: 'var(--step--1)', fontWeight: 500, color: 'var(--ink)' }}>{title}</span>
        {trailing}
      </button>
      {open ? (
        <div
          id={panelId}
          style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function abbreviateLabel(text: string, max = 11): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
