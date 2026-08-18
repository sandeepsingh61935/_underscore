/**
 * @file ScopeRowActions.tsx
 * @description Quiet delete icon for domain/section rows.
 * Fixed hit targets; no action verbs in the list disclosure control.
 */

import React from 'react';

function IconDelete(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface ScopeRowActionsProps {
  kind: 'domain' | 'section';
  onDelete?: () => void;
  /** When false, renders nothing (Free / Guest). */
  show?: boolean;
}

export function ScopeRowActions({
  kind,
  onDelete,
  show = true,
}: ScopeRowActionsProps): React.ReactElement | null {
  if (!show || !onDelete) return null;

  const delLabel = kind === 'section' ? 'Delete section' : 'Delete domain';

  return (
    <div className="sr-actions" data-testid="scope-row-actions">
      <button
        type="button"
        className="sr-icon is-delete"
        title={delLabel}
        aria-label={delLabel}
        data-testid="scope-row-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <IconDelete />
      </button>
    </div>
  );
}
