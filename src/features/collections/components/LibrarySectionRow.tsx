/**
 * @file LibrarySectionRow.tsx
 * @description Section list row: path/title + count; optional Paid quiet actions.
 * No inline rename/edit — disclosure is the row itself.
 */

import React from 'react';

import { ScopeRowActions } from '@/features/collections/components/ScopeRowActions';

export interface LibrarySectionRowProps {
  title: string;
  count: number;
  onOpen: () => void;
  showActions?: boolean;
  onDelete?: () => void;
}

export function LibrarySectionRow({
  title,
  count,
  onOpen,
  showActions = false,
  onDelete,
}: LibrarySectionRowProps): React.ReactElement {
  return (
    <div className="section-item">
      <button type="button" className="section-row" onClick={onOpen} aria-label={title}>
        <span className="sr-path">{title}</span>
        <span className="sr-count">{count}</span>
      </button>
      <ScopeRowActions
        kind="section"
        show={showActions}
        onDelete={onDelete}
      />
    </div>
  );
}
