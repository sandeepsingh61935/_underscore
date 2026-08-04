/**
 * @file LibrarySectionRow.tsx
 * @description Section list row: path/title + count; optional Paid quiet actions.
 */

import React from 'react';

import { ScopeRowActions } from '@/features/collections/components/ScopeRowActions';

export interface LibrarySectionRowProps {
  title: string;
  count: number;
  onOpen: () => void;
  showActions?: boolean;
  onAsk?: () => void;
  onDelete?: () => void;
  /** Optional edit control for section labels (cloud). */
  onEdit?: () => void;
  canEdit?: boolean;
}

export function LibrarySectionRow({
  title,
  count,
  onOpen,
  showActions = false,
  onAsk,
  onDelete,
  onEdit,
  canEdit = false,
}: LibrarySectionRowProps): React.ReactElement {
  return (
    <div className="section-item">
      <button type="button" className="section-row" onClick={onOpen} aria-label={title}>
        <span className="sr-path">{title}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {canEdit && onEdit && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }
              }}
              style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}
              aria-label="Edit section display name"
            >
              [edit]
            </span>
          )}
          <span className="sr-count">{count}</span>
        </span>
      </button>
      <ScopeRowActions
        kind="section"
        show={showActions}
        onAsk={onAsk}
        onDelete={onDelete}
      />
    </div>
  );
}
