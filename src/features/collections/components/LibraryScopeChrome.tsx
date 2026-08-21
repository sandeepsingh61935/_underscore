/**
 * Section/domain sticky chrome — ledger header + one instrument bar.
 * Path is identity; tools never share the title row.
 */
import React, { type ReactNode } from 'react';

import { ExportActions, type ExportViewScope } from '@/features/collections/components/ExportActions';
import { LibrarySortControl } from '@/features/collections/components/LibrarySortControl';
import type { LibrarySortKey } from '@/shared/library/library-sort';

export type LibraryScopeChromeProps = {
  /** Path or domain display title */
  title: string;
  highlightCount: number;
  exportScope: ExportViewScope;
  exportDisabled?: boolean;
  onDelete?: () => void;
  deleteAriaLabel: string;
  sort: LibrarySortKey;
  onSortChange: (next: LibrarySortKey) => void;
  /** Search + filters slot (full flex of instrument bar) */
  searchSlot: ReactNode;
  testId?: string;
  toolbarTestId?: string;
};

function IconTrash(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LibraryScopeChrome({
  title,
  highlightCount,
  exportScope,
  exportDisabled,
  onDelete,
  deleteAriaLabel,
  sort,
  onSortChange,
  searchSlot,
  testId = 'library-scope-chrome',
  toolbarTestId = 'scope-toolbar',
}: LibraryScopeChromeProps): React.ReactElement {
  const countLabel =
    highlightCount === 1 ? '1 highlight' : `${highlightCount} highlights`;

  return (
    <div
      data-testid={testId}
      style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper)',
      }}
    >
      {/* Identity — never shares row with tools */}
      <div style={{ padding: '12px 16px 8px' }}>
        <h2
          className="u-serif"
          title={title}
          style={{
            margin: 0,
            fontSize: 'var(--step-2)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h2>
        <div
          className="u-mono"
          style={{
            marginTop: 4,
            fontSize: 'var(--step--2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {countLabel}
        </div>
      </div>

      {/* One instrument bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px 8px',
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>{searchSlot}</div>
        {highlightCount > 0 ? (
          <div
            className="scope-toolbar"
            data-testid={toolbarTestId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              paddingLeft: 8,
              borderLeft: '1px solid var(--rule-soft)',
              minHeight: 32,
            }}
          >
            <ExportActions
              scope={exportScope}
              highlightCount={highlightCount}
              disabled={exportDisabled}
              variant="menu"
            />
            {onDelete ? (
              <button
                type="button"
                className="sr-icon is-delete"
                aria-label={deleteAriaLabel}
                title={deleteAriaLabel}
                onClick={onDelete}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                <IconTrash />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Quiet sort — mono text, no slab */}
      <div style={{ padding: '0 16px 10px' }}>
        <LibrarySortControl value={sort} onChange={onSortChange} variant="text" />
      </div>
    </div>
  );
}
