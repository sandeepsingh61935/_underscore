/**
 * Composes a `HighlightCard` with embedded `MarginaliaStrip` on one action row
 * (notes · tags · Edit · Copy · Delete). Density PRD:
 * docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 */
import React from 'react';

import { MarginaliaStrip } from '@/features/collections/components/MarginaliaStrip';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

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
  onDelete?: () => void;
  onSaveQuote?: (text: string) => Promise<boolean>;
  showLocationMeta?: boolean;
  disabled?: boolean;
  suggestions?: string[];
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
  onCopy,
  onDelete,
  onSaveQuote,
  showLocationMeta,
  disabled,
  suggestions,
}: HighlightWithMarginaliaProps): React.ReactElement {
  return (
    <HighlightCard
      quote={quote}
      domain={domain}
      section={section}
      onCopy={onCopy}
      onDelete={onDelete}
      onSaveQuote={onSaveQuote}
      showLocationMeta={showLocationMeta}
      footerStart={(
        <MarginaliaStrip
          highlightId={highlightId}
          notes={notes}
          labels={labels}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          disabled={disabled}
          suggestions={suggestions}
          embedInCard
        />
      )}
    />
  );
}
