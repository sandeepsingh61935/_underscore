/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (MarginaliaStrip section, TagPill)
 * V2 contract:
 *   - 20px tall, var(--radius) corners (NOT round), var(--rule-soft) border
 *     (dashed when `ghost`), mono var(--step--2) label.
 *   - Distinct from the 44px `Chip` primitive — this is a small inline label
 *     pill for the MarginaliaStrip / LabelInputRow, never a tap target on
 *     its own body.
 *   - `readonly`: display-only (collapsed strip), border only, no fill.
 *   - `onRemove`: renders a 16px inline "x" button (not 44px), stops
 *     propagation so removing a pill never bubbles into a parent toggle.
 *   - `ghost`: dashed border, muted ink, label prefixed with "+ "; if
 *     `onPick` is also supplied the whole pill becomes a clickable button
 *     (used for suggestion picks in LabelInputRow).
 */
import React from 'react';

export interface TagPillProps {
  label: string;
  onRemove?: () => void;
  readonly?: boolean;
  ghost?: boolean;
  onPick?: () => void;
}

export function TagPill({
  label,
  onRemove,
  readonly,
  ghost,
  onPick,
}: TagPillProps): React.ReactElement {
  const inner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: 20,
        width: 'fit-content',
        maxWidth: '100%',
        padding: onRemove ? '0 2px 0 6px' : '0 6px',
        borderRadius: 'var(--radius)',
        border: `1px ${ghost ? 'dashed' : 'solid'} var(--rule-soft)`,
        background: ghost || readonly ? 'transparent' : 'var(--paper-2)',
        boxSizing: 'border-box',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 'var(--step--2)',
          color: ghost ? 'var(--ink-3)' : 'var(--ink-2)',
          whiteSpace: 'nowrap',
        }}
      >
        {ghost ? `+ ${label}` : label}
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            minWidth: 16,
            minHeight: 16,
            padding: 0,
            fontSize: 10,
            lineHeight: 1,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-3)',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </span>
  );

  if (ghost && onPick) {
    return (
      <button
        type="button"
        onClick={onPick}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
        }}
      >
        {inner}
      </button>
    );
  }

  return inner;
}
