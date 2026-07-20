/**
 * Single library tile: maps a highlight summary → HighlightCard (+ optional marginalia).
 * Owns presentation persistence so views do not re-spread metadata props.
 */
import React, { useCallback } from 'react';

import { MarginaliaStrip } from '@/features/collections/components/MarginaliaStrip';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

export interface LibraryHighlightFields {
  id: string;
  text: string;
  domain: string;
  /** URL path; omit or "/" hides section segment. */
  path?: string;
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation | null;
}

export interface LibraryHighlightTileProps {
  highlight: LibraryHighlightFields;
  showLocationMeta?: boolean;
  onSectionClick?: () => void;
  onDelete?: () => void;
  /** When true, embed notes/tags strip (tags feature gate). */
  allowMarginalia?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  suggestions?: string[];
}

function sectionFromPath(path: string | undefined): string | undefined {
  if (!path || path === '/') return undefined;
  return path;
}

export function LibraryHighlightTile({
  highlight,
  showLocationMeta = true,
  onSectionClick,
  onDelete,
  allowMarginalia = false,
  isExpanded = false,
  onToggleExpand,
  suggestions,
}: LibraryHighlightTileProps): React.ReactElement {
  const { updateMetadata } = useUpdateHighlightMetadata();

  const onPresentationChange = useCallback(
    async (presentation: HighlightPresentation): Promise<void> => {
      const ok = await updateMetadata(highlight.id, { presentation }, { silent: true });
      if (!ok) {
        throw new Error('Failed to save presentation');
      }
    },
    [highlight.id, updateMetadata],
  );

  const quote = highlight.text || '[Unavailable]';
  const onCopy = highlight.text
    ? () => {
        void copyHighlightPlainText(highlight.text);
      }
    : undefined;

  const footerStart =
    allowMarginalia && onToggleExpand ? (
      <MarginaliaStrip
        highlightId={highlight.id}
        notes={highlight.notes}
        labels={highlight.tags}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        suggestions={suggestions}
        embedInCard
      />
    ) : undefined;

  return (
    <HighlightCard
      quote={quote}
      domain={highlight.domain}
      section={sectionFromPath(highlight.path)}
      showLocationMeta={showLocationMeta}
      sourceKind={highlight.sourceKind}
      language={highlight.language}
      presentation={highlight.presentation}
      onSectionClick={onSectionClick}
      onCopy={onCopy}
      onDelete={onDelete}
      onPresentationChange={onPresentationChange}
      footerStart={footerStart}
    />
  );
}
