/**
 * @deprecated Prefer LibraryHighlightTile with allowMarginalia.
 * Thin wrapper kept for tests / gradual migration.
 */
import React from 'react';

import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

export interface HighlightWithMarginaliaProps {
  highlightId: string;
  quote: string;
  domain: string;
  section?: string;
  notes?: string;
  labels?: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopy?: () => void;
  onDelete?: () => void | Promise<void>;
  showLocationMeta?: boolean;
  disabled?: boolean;
  suggestions?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation | null;
}

export function HighlightWithMarginalia({
  highlightId,
  quote,
  domain,
  section,
  notes,
  labels,
  isExpanded,
  onToggleExpand,
  onDelete,
  showLocationMeta,
  suggestions,
  sourceKind,
  language,
  presentation,
}: HighlightWithMarginaliaProps): React.ReactElement {
  return (
    <LibraryHighlightTile
      highlight={{
        id: highlightId,
        text: quote,
        domain,
        path: section,
        notes,
        tags: labels,
        sourceKind,
        language,
        presentation,
      }}
      showLocationMeta={showLocationMeta}
      onDelete={onDelete}
      allowMarginalia
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      suggestions={suggestions}
    />
  );
}
