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
  const showEdit = Boolean(canEdit && onEdit);
  const hasTrailing = showEdit || showActions;

  return (
    <div className="section-item">
      <button type="button" className="section-row" onClick={onOpen} aria-label={title}>
        <span className="sr-path">{title}</span>
        <span className="sr-count">{count}</span>
      </button>
      {hasTrailing ? (
        <div className="sr-trailing">
          {showEdit && onEdit ? (
            <button
              type="button"
              className="sr-edit"
              aria-label="Edit section display name"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              [edit]
            </button>
          ) : null}
          <ScopeRowActions
            kind="section"
            show={showActions}
            onAsk={onAsk}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </div>
  );
}
