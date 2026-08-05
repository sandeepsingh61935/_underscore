import React from 'react';

import {
  useHighlightExport,
  type ExportViewScope,
} from '@/features/collections/hooks/useHighlightExport';
import type { ExportFormat } from '@/shared/highlight-export';
import { BtnText } from '@/ui-system/components/primitives/BtnText';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

export type { ExportViewScope };

export interface ExportActionsProps {
  scope: ExportViewScope;
  disabled?: boolean;
  highlightCount?: number;
}

const FORMATS: { id: ExportFormat; label: string; aria: string }[] = [
  { id: 'md', label: 'MD', aria: 'Markdown' },
  { id: 'xlsx', label: 'XLSX', aria: 'Spreadsheet' },
];

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
    <div className="export-inline" data-testid="export-actions">
      {isBusy ? (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          aria-live="polite"
          aria-busy="true"
        >
          <Spinner size="sm" />
        </span>
      ) : null}
      {FORMATS.map((format) => (
        <BtnText
          key={format.id}
          muted={isDisabled}
          disabled={isDisabled}
          aria-label={`Export ${label} as ${format.aria}`}
          onClick={() => {
            void exportFile(format.id);
          }}
        >
          {format.label}
        </BtnText>
      ))}
    </div>
  );
}
