/**
 * Section/domain sticky chrome — ledger header + one instrument bar.
 * Path is identity; tools never share the title row.
 */
import React, { type ReactNode } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';

import {
  ExportActions,
  type ExportViewScope,
} from '@/features/collections/components/ExportActions';
import { LibrarySortControl } from '@/features/collections/components/LibrarySortControl';
import type { LibrarySortKey } from '@/shared/library/library-sort';

export type LibraryScopeChromeProps = {
  /** Path or domain display title */
  title: string;
  highlightCount: number;
  exportScope: ExportViewScope;
  exportDisabled?: boolean;
  onDelete?: () => void;
  deleteAriaLabel?: string;
  showDelete?: boolean;
  onOpenPage?: () => void;
  sort: LibrarySortKey;
  onSortChange: (next: LibrarySortKey) => void;
  /** Search + filters slot (full flex of instrument bar or render function receiving toolbar) */
  searchSlot: ReactNode | ((toolbar: ReactNode) => ReactNode);
  testId?: string;
  toolbarTestId?: string;
};

export function LibraryScopeChrome({
  title,
  highlightCount,
  exportScope,
  exportDisabled,
  onDelete,
  deleteAriaLabel,
  showDelete = false,
  onOpenPage,
  sort,
  onSortChange,
  searchSlot,
  testId = 'library-scope-chrome',
  toolbarTestId = 'scope-toolbar',
}: LibraryScopeChromeProps): React.ReactElement {
  const countLabel =
    highlightCount === 1 ? '1 highlight' : `${highlightCount} highlights`;

  const toolbar =
    highlightCount > 0 ? (
      <div
        className="scope-toolbar"
        data-testid={toolbarTestId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <ExportActions
          scope={exportScope}
          highlightCount={highlightCount}
          disabled={exportDisabled}
          variant="icon"
        />
        {onOpenPage ? (
          <button
            type="button"
            className="sr-icon"
            aria-label="Open page in new browser tab"
            title="Open page in new browser tab"
            onClick={onOpenPage}
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <ExternalLink size={16} aria-hidden="true" />
          </button>
        ) : null}
        {showDelete && onDelete ? (
          <button
            type="button"
            className="sr-icon is-delete"
            aria-label={deleteAriaLabel || 'Delete'}
            title={deleteAriaLabel || 'Delete'}
            onClick={onDelete}
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      data-testid={testId}
      style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper)',
      }}
    >
      {/* Identity row with scope tools on the right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px 8px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
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
        </div>
        {toolbar}
      </div>

      {/* Spacious Search bar — full width */}
      <div style={{ padding: '0 16px 8px', minWidth: 0 }}>
        {typeof searchSlot === 'function' ? searchSlot(null) : searchSlot}
      </div>

      {/* Counter on opposite end of sort control */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px 10px',
        }}
      >
        <div
          className="u-mono"
          style={{
            fontSize: 'var(--step--2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {countLabel}
        </div>
        <LibrarySortControl value={sort} onChange={onSortChange} variant="text" align="right" />
      </div>
    </div>
  );
}
