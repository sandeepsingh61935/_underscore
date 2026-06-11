/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L308-331 (Row primitive)
 * V2 contract: <button> with display:grid, columns auto 1fr auto (when left
 *   is present) or 1fr auto (no left). min-height 44px. padding 14px 16px
 *   (default) or 10px 16px (compact). border-bottom 1px var(--rule-soft).
 *   title in --ink / 14px / 500 weight / ellipsis, sub in --ink-3 / 10px mono.
 */
import React, { type ReactNode } from 'react';

export interface RowProps {
  left?: ReactNode;
  title: string;
  meta?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
  sub?: string;
}

export function Row({ left, title, right, onClick, compact = false, sub }: RowProps): React.ReactElement {
  return (
    <button onClick={onClick} className="u-sans" style={{
      all: "unset",
      cursor: onClick ? "pointer" : "default",
      display: "grid",
      gridTemplateColumns: left ? "auto 1fr auto" : "1fr auto",
      alignItems: "center",
      gap: 12,
      padding: compact ? "10px 16px" : "14px 16px",
      borderBottom: "1px solid var(--rule-soft)",
      minHeight: 44,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {left}
      <div style={{ minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        {sub && <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </button>
  );
}
