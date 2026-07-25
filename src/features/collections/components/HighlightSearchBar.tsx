/**
 * @file HighlightSearchBar.tsx
 * @description Presentational search bar for the Library: text input (debounced)
 * and field chips (Text / Notes / Tags). Purely controlled by props — no data
 * fetching, no mode gating, no scope selection (search scope is implicit from
 * the parent view — library, domain, or section).
 *
 * Visual spec (V2 Editorial, see CLAUDE.md):
 *  - Input row: hairline border (`--rule-soft`), `--radius` (2px) corners,
 *    `--paper` fill, mono search glyph, sans input text at `--step-0`.
 *  - Field chips: 20px tall, `--radius` corners, mono `--step--2` label,
 *    `--rule-soft` border always, `--paper-2` fill only when active,
 *    transparent fill when inactive (never the 44px `Chip` primitive).
 *    All chips sit on a single row (no wrap).
 *  - Result count: mono `--step--1`, `--ink-3` (muted kicker line).
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import type { SearchField } from '@/shared/utils/highlight-search';

export interface HighlightSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  fields: SearchField[];
  onFieldsChange: (fields: SearchField[]) => void;
  resultCount?: number;
  placeholder?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 150;

/** The three user-facing search fields; `url` is matched internally but never surfaced as a chip. */
const USER_FACING_FIELDS: SearchField[] = ['text', 'notes', 'tags'];

const FIELD_CHIP_LABELS: Record<SearchField, string> = {
  text: 'Text',
  notes: 'Notes',
  tags: 'Tags',
  url: 'URL',
};

interface FieldChipProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Small local pill/chip used for field toggles.
 * Intentionally NOT the `src/ui-system/components/primitives/Chip.tsx`
 * primitive — that component has a 44px min touch target which is far too
 * large for this dense, inline control row.
 */
function FieldChip({ label, active, disabled, onClick }: FieldChipProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="u-mono"
      style={{
        height: 20,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 8px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--rule-soft)',
        background: active ? 'var(--paper-2)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        fontSize: 'var(--step--2)',
        letterSpacing: '0.02em',
        lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function fieldsCoverAll(fields: SearchField[]): boolean {
  return USER_FACING_FIELDS.every((f) => fields.includes(f));
}

function resultCountLabel(count: number): string {
  if (count === 0) return 'No results';
  if (count === 1) return '1 result';
  return `${count} results`;
}

export function HighlightSearchBar(props: HighlightSearchBarProps): React.ReactElement {
  const {
    query,
    onQueryChange,
    fields,
    onFieldsChange,
    resultCount,
    placeholder = 'Search highlights…',
    disabled = false,
  } = props;

  const [inputValue, setInputValue] = useState(query);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from external changes (e.g. parent clearing the query) — but skip
  // clobbering the box while the user is actively typing/debouncing, since
  // `props.query` intentionally lags `inputValue` by DEBOUNCE_MS.
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.value;
    setInputValue(next);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      onQueryChange(next);
    }, DEBOUNCE_MS);
  };

  const handleClear = (): void => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    setInputValue('');
    onQueryChange('');
  };

  const isFieldActive = (field: SearchField): boolean => fields.includes(field);
  const isAllActive = fieldsCoverAll(fields);

  const selectField = (field: SearchField): void => {
    // Exclusive selection: one chip active at a time. Clicking the sole active
    // chip again returns to All (all three fields).
    if (fields.length === 1 && fields[0] === field) {
      onFieldsChange([...USER_FACING_FIELDS]);
      return;
    }
    onFieldsChange([field]);
  };

  const handleAllClick = (): void => {
    onFieldsChange([...USER_FACING_FIELDS]);
  };

  const trimmedQuery = query.trim();
  const showResultCount = trimmedQuery.length > 0 && resultCount !== undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid var(--rule-soft)',
          borderRadius: 'var(--radius)',
          background: 'var(--paper)',
          padding: '8px 10px',
        }}
      >
        <span
          aria-hidden="true"
          className="u-mono"
          style={{ color: 'var(--ink-3)', fontSize: 'var(--step-1)', lineHeight: 1 }}
        >
          ⌕
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label="Search highlights"
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            fontFamily: 'var(--sans)',
            fontSize: 'var(--step-0)',
          }}
        />
        {inputValue.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
            disabled={disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-3)',
              fontSize: 'var(--step-0)',
              lineHeight: 1,
              cursor: disabled ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'nowrap',
          overflowX: 'auto',
        }}
      >
        <FieldChip label="All" active={isAllActive} disabled={disabled} onClick={handleAllClick} />
        <FieldChip
          label={FIELD_CHIP_LABELS.text}
          active={isFieldActive('text')}
          disabled={disabled}
          onClick={() => selectField('text')}
        />
        <FieldChip
          label={FIELD_CHIP_LABELS.notes}
          active={isFieldActive('notes')}
          disabled={disabled}
          onClick={() => selectField('notes')}
        />
        <FieldChip
          label={FIELD_CHIP_LABELS.tags}
          active={isFieldActive('tags')}
          disabled={disabled}
          onClick={() => selectField('tags')}
        />
      </div>

      {showResultCount && (
        <span className="u-mono" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
          {resultCountLabel(resultCount as number)}
        </span>
      )}
    </div>
  );
}
