/**
 * Single library tile: maps a highlight summary → HighlightCard (+ optional marginalia).
 * Owns quote text persistence so views do not re-spread IPC props.
 */
import React, { useCallback } from 'react';

import { MarginaliaStrip } from '@/features/collections/components/MarginaliaStrip';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { useUpdateHighlightText } from '@/features/collections/hooks/useUpdateHighlightText';
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
  /** Display-only legacy/capture hint — not edited via chip UI. */
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
  /** Search hit badge (e.g. "Notes · Tags"); omit when not searching. */
  matchBadge?: string | null;
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
  matchBadge,
}: LibraryHighlightTileProps): React.ReactElement {
  const { updateText } = useUpdateHighlightText();

  const onSaveQuote = useCallback(
    async (text: string): Promise<boolean> => updateText(highlight.id, text),
    [highlight.id, updateText],
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
      onSaveQuote={onSaveQuote}
      footerStart={footerStart}
      matchBadge={matchBadge}
    />
  );
}
