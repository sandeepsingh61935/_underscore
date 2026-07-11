import React from 'react';

import {
  useHighlightExport,
  type ExportViewScope,
} from '@/features/collections/hooks/useHighlightExport';
import type { ExportFormat } from '@/shared/highlight-export';

export type { ExportViewScope };

export interface ExportActionsProps {
  scope: ExportViewScope;
  disabled?: boolean;
  highlightCount?: number;
}

const FORMATS: ExportFormat[] = ['md', 'xlsx'];

function scopeLabel(scope: ExportViewScope): string {
  switch (scope.kind) {
    case 'library':
      return 'library';
    case 'domain':
      return 'domain';
    case 'section':
      return 'section';
  }
}

const buttonStyle = (isDisabled: boolean): React.CSSProperties => ({
  all: 'unset',
  cursor: isDisabled ? 'wait' : 'pointer',
  fontFamily: 'var(--mono)',
  fontSize: 'var(--step--2)',
  color: isDisabled ? 'var(--ink-4)' : 'var(--accent)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
});

export function ExportActions({
  scope,
  disabled = false,
  highlightCount,
}: ExportActionsProps): React.ReactElement | null {
  const hasHighlights = highlightCount === undefined || highlightCount > 0;
  const { exportFile, isBusy } = useHighlightExport(scope, {
    enabled: hasHighlights && !disabled,
  });

  if (!hasHighlights) {
    return null;
  }

  const label = scopeLabel(scope);
  const isDisabled = disabled || isBusy;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {FORMATS.map((format, index) => (
        <React.Fragment key={format}>
          {index > 0 && (
            <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-4)' }}>·</span>
          )}
          <button
            type="button"
            onClick={() => { void exportFile(format); }}
            disabled={isDisabled}
            aria-label={`Export ${label} highlights as ${format.toUpperCase()}`}
            className="u-mono"
            style={buttonStyle(isDisabled)}
          >
            {format.toUpperCase()}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
