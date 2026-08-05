/**
 * @file ScopeRowActions.tsx
 * @description Quiet ask + delete icon pair for Paid domain/section rows.
 * Fixed hit targets; no action verbs in the list disclosure control.
 */

import React from 'react';

function IconChat(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 3.5h10v7H7.5L5 12.5V10.5H3v-7z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  onAsk?: () => void;
  onDelete?: () => void;
  /** When false, renders nothing (Free / Guest). */
  show?: boolean;
}

export function ScopeRowActions({
  kind,
  onAsk,
  onDelete,
  show = true,
}: ScopeRowActionsProps): React.ReactElement | null {
  if (!show || (!onAsk && !onDelete)) return null;

  const askLabel = kind === 'section' ? 'Ask about this section' : 'Ask about this domain';
  const delLabel = kind === 'section' ? 'Delete section' : 'Delete domain';

  return (
    <div className="sr-actions" data-testid="scope-row-actions">
      {onAsk ? (
        <button
          type="button"
          className="sr-icon"
          title={askLabel}
          aria-label={askLabel}
          data-testid="scope-row-ask"
          onClick={(e) => {
            e.stopPropagation();
            onAsk();
          }}
        >
          <IconChat />
        </button>
      ) : null}
      {onDelete ? (
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
      ) : null}
    </div>
  );
}
