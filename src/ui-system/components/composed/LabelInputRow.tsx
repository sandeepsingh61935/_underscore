/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (MarginaliaStrip section)
 * V2 contract: single flex-wrap row (NOT the old Chip's stacked layout) —
 * committed tag pills, a bare native input for the draft, then dashed
 * ghost pills for matching suggestions, all in one line that wraps.
 *
 * `variant`:
 *  - `tray` (default): own bordered paper tray (standalone / legacy).
 *  - `embedded`: no outer chrome — content only, for use inside a parent
 *    shared Notes|Tags tray (see MarginaliaStrip inline band spec).
 *
 * Contract for `draft`/`onAddLabel`: this component does NOT clear `draft`
 * itself after Enter/comma or a ghost-pill pick — `onAddLabel` is the
 * single source of truth for committing a tag. The caller's `onAddLabel`
 * handler is responsible for appending the tag and calling
 * `onDraftChange('')` once committed. This keeps "add a tag" a single
 * code path regardless of whether it was triggered by keyboard or by
 * picking a suggestion.
 */
import React from 'react';

import { TagPill } from '@/ui-system/components/primitives/TagPill';

export interface LabelInputRowProps {
  labels: string[];
  onRemoveLabel: (index: number) => void;
  onAddLabel: (name: string) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  suggestions?: string[];
  disabled?: boolean;
  placeholder?: string;
  /** `tray` = own border; `embedded` = chrome-less for a parent shared tray. */
  variant?: 'tray' | 'embedded';
}

export function LabelInputRow({
  labels,
  onRemoveLabel,
  onAddLabel,
  draft,
  onDraftChange,
  suggestions = [],
  disabled = false,
  placeholder,
  variant = 'tray',
}: LabelInputRowProps): React.ReactElement {
  const trimmedDraft = draft.trim();
  const visibleSuggestions = suggestions
    .filter((name) => !labels.includes(name))
    .filter(
      (name) => !trimmedDraft || name.toLowerCase().startsWith(trimmedDraft.toLowerCase())
    );

  const resolvedPlaceholder = placeholder ?? (labels.length === 0 ? 'Add tag…' : '');
  const embedded = variant === 'embedded';

  return (
    <div
      data-variant={variant}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 5,
        boxSizing: 'border-box',
        ...(embedded
          ? {
              padding: 0,
              borderWidth: 0,
              borderStyle: 'none',
              background: 'transparent',
              minHeight: 0,
            }
          : {
              padding: '4px 6px',
              border: '1px solid var(--rule-soft)',
              background: 'var(--paper)',
              minHeight: 28,
            }),
      }}
    >
      {labels.map((label, index) => (
        <TagPill
          key={`${label}-${index}`}
          label={label}
          onRemove={() => onRemoveLabel(index)}
        />
      ))}
      <input
        type="text"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const trimmed = draft.trim();
            if (trimmed) {
              onAddLabel(trimmed);
            }
          }
        }}
        disabled={disabled}
        placeholder={resolvedPlaceholder}
        aria-label="Add tag"
        style={{
          flex: '1 1 56px',
          minWidth: 56,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--mono)',
          fontSize: 'var(--step--2)',
          color: 'var(--ink)',
          padding: '2px 0',
        }}
      />
      {visibleSuggestions.map((name) => (
        <TagPill key={name} ghost label={name} onPick={() => onAddLabel(name)} />
      ))}
    </div>
  );
}
