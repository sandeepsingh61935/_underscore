/**
 * Design contract: src/ui-system/theme/global.css (Row section)
 * <button> with display:grid, columns auto 1fr auto (when left
 *   is present) or 1fr auto (no left). min-height var(--control-h).
 *   padding 14px var(--type-inset-padding) (default) or 10px (compact).
 *   border-bottom 1px var(--rule-soft).
 *   title in var(--ink) / var(--type-title-row) / 500 weight / ellipsis,
 *   sub in var(--ink-3) / var(--type-label) mono.
 */
import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface RowProps extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'role' | 'aria-checked' | 'aria-labelledby' | 'aria-label' | 'aria-disabled'
> {
  left?: ReactNode;
  title: string;
  meta?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
  sub?: string;
}

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: 'var(--type-section-gap)',
  padding: '14px var(--type-inset-padding)',
  borderBottom: '1px solid var(--rule-soft)',
  minHeight: 'var(--control-h)',
  width: '100%',
  boxSizing: 'border-box',
};

function RowContent({
  left,
  title,
  right,
  sub,
}: Pick<RowProps, 'left' | 'title' | 'right' | 'sub'>): React.ReactElement {
  return (
    <>
      {left}
      <div style={{ minWidth: 0, textAlign: 'left' }}>
        <div
          style={{
            fontSize: 'var(--type-title-row)',
            color: 'var(--ink)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {sub ? (
          <div
            className="u-mono"
            style={{
              fontSize: 'var(--type-label)',
              color: 'var(--ink-3)',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      {right}
    </>
  );
}

export function Row({
  left,
  title,
  right,
  onClick,
  compact = false,
  sub,
  role,
  'aria-checked': ariaChecked,
  'aria-labelledby': ariaLabelledby,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
}: RowProps): React.ReactElement {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="u-sans"
        role={role}
        aria-checked={ariaChecked}
        aria-labelledby={ariaLabelledby}
        aria-label={ariaLabel ?? title}
        aria-disabled={ariaDisabled}
        style={{
          all: 'unset',
          cursor: 'pointer',
          ...rowStyle,
          padding: compact
            ? '10px var(--type-inset-padding)'
            : '14px var(--type-inset-padding)',
          gridTemplateColumns: left ? 'auto 1fr auto' : '1fr auto',
        }}
      >
        <RowContent left={left} title={title} right={right} sub={sub} />
      </button>
    );
  }

  return (
    <div
      className="u-sans"
      style={{
        ...rowStyle,
        padding: compact
          ? '10px var(--type-inset-padding)'
          : '14px var(--type-inset-padding)',
        gridTemplateColumns: left ? 'auto 1fr auto' : '1fr auto',
      }}
    >
      <RowContent left={left} title={title} right={right} sub={sub} />
    </div>
  );
}
