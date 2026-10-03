/**
 * Single library tile: maps a highlight summary → HighlightCard (+ optional marginalia).
 * Owns quote text persistence so views do not re-spread IPC props.
 * Owns single-highlight danger confirm before calling onDelete.
 */
import React, { useCallback, useRef, useState } from 'react';

import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import {
  copyHighlightPlainText,
  copyQuoteLink,
} from '@/features/collections/hooks/useHighlightExport';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { useUpdateHighlightText } from '@/features/collections/hooks/useUpdateHighlightText';
import { deleteHighlightCopy } from '@/shared/utils/confirm-dialog-copy';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { openExternalUrl } from '@/shared/utils/open-external-url';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

export interface LibraryHighlightFields {
  id: string;
  text: string;
  domain: string;
  /** Full URL if known for direct navigation / deep-linking */
  url?: string;
  /** URL path; omit or "/" hides section segment. */
  path?: string;
  notes?: string;
  tags?: string[];
  selector?: {
    exact: string;
    prefix?: string;
    suffix?: string;
  };
  sourceKind?: 'code';
  language?: string;
  /** Display-only legacy/capture hint — not edited via chip UI. */
  presentation?: HighlightPresentation | null;
}

export interface LibraryHighlightTileProps {
  highlight: LibraryHighlightFields;
  showLocationMeta?: boolean;
  onSectionClick?: () => void;
  /** Opens the quote page for this highlight. */
  onOpenDetail?: () => void;
  /** May be async; dialog stays busy until the promise settles. */
  onDelete?: () => void | Promise<void>;
  /** When true, embed notes/tags strip (tags feature gate). */
  allowMarginalia?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  suggestions?: string[];
  /** Search hit badge (e.g. "Notes · Tags"); omit when not searching. */
  matchBadge?: string | null;
  /** When true, marks highlight as unanchored on the active page */
  isUnanchored?: boolean;
  /** Callback to re-anchor highlight to current DOM selection */
  onReanchor?: () => void | Promise<void>;
  /** Whether re-anchoring is currently available (false if page has no selection) */
  canReanchor?: boolean;
}

function sectionFromPath(path: string | undefined): string | undefined {
  if (!path || path === '/') return undefined;
  return path;
}

export function LibraryHighlightTile({
  highlight,
  showLocationMeta = true,
  onSectionClick,
  onOpenDetail,
  onDelete,
  allowMarginalia = false,
  isExpanded: _isExpanded = false,
  onToggleExpand: _onToggleExpand,
  suggestions,
  matchBadge,
  isUnanchored = false,
  onReanchor,
  canReanchor = true,
}: LibraryHighlightTileProps): React.ReactElement {
  const { updateText } = useUpdateHighlightText();
  const { updateMetadata } = useUpdateHighlightMetadata();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const onSaveQuote = useCallback(
    async (text: string): Promise<boolean> => updateText(highlight.id, text),
    [highlight.id, updateText]
  );

  const onSaveNotes = useCallback(
    async (notes: string): Promise<boolean> =>
      updateMetadata(highlight.id, { notes }, { silent: true }),
    [highlight.id, updateMetadata]
  );

  const onSaveTags = useCallback(
    async (tags: string[]): Promise<boolean> =>
      updateMetadata(highlight.id, { tags }, { silent: true }),
    [highlight.id, updateMetadata]
  );

  const quote = highlight.text || '[Unavailable]';
  const onCopy = highlight.text
    ? () => {
        void copyHighlightPlainText(highlight.text);
      }
    : undefined;

  const onCopyQuoteLink =
    highlight.text && (highlight.url || highlight.domain)
      ? () => {
          const baseUrl =
            highlight.url || `https://${highlight.domain}${highlight.path || ''}`;
          const fragmentUrl = buildTextFragmentUrl(baseUrl, {
            exact: highlight.selector?.exact || highlight.text,
            prefix: highlight.selector?.prefix,
            suffix: highlight.selector?.suffix,
          });
          void copyQuoteLink(fragmentUrl);
        }
      : undefined;

  const onOpen =
    highlight.text && (highlight.url || highlight.domain)
      ? () => {
          const baseUrl =
            highlight.url || `https://${highlight.domain}${highlight.path || ''}`;
          const fragmentUrl = buildTextFragmentUrl(baseUrl, {
            exact: highlight.selector?.exact || highlight.text,
            prefix: highlight.selector?.prefix,
            suffix: highlight.selector?.suffix,
          });
          openExternalUrl(fragmentUrl);
        }
      : undefined;

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!onDelete || isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteOpen(false);
    } catch {
      // Keep dialog open so the user can retry after a failed delete.
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }, [onDelete]);

  const deleteCopy = deleteHighlightCopy();

  return (
    <>
      <HighlightCard
        quote={quote}
        domain={highlight.domain}
        section={sectionFromPath(highlight.path)}
        showLocationMeta={showLocationMeta}
        sourceKind={highlight.sourceKind}
        language={highlight.language}
        presentation={highlight.presentation}
        onSectionClick={onSectionClick}
        onQuoteClick={onOpenDetail}
        onCopy={onCopy}
        onCopyQuoteLink={onCopyQuoteLink}
        onOpen={onOpen}
        onDelete={onDelete ? () => setDeleteOpen(true) : undefined}
        onSaveQuote={onSaveQuote}
        notes={highlight.notes}
        tags={highlight.tags}
        onSaveNotes={allowMarginalia ? onSaveNotes : undefined}
        onSaveTags={allowMarginalia ? onSaveTags : undefined}
        tagSuggestions={suggestions}
        matchBadge={matchBadge}
        isUnanchored={isUnanchored}
        onReanchor={onReanchor}
        canReanchor={canReanchor}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        severity={deleteCopy.severity}
        title={deleteCopy.title}
        message={deleteCopy.message}
        note={deleteCopy.note}
        strongNames={deleteCopy.strongNames}
        confirmLabel={deleteCopy.confirmLabel}
        cancelLabel={deleteCopy.cancelLabel}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </>
  );
}
