/**
 * @file LibraryHighlightDetail.tsx
 * @description Web library highlight detail: full card + related highlights.
 */

import React from 'react';

import {
  RelatedHighlightsSection,
  type RelatedHighlightRow,
} from '@/web/components/RelatedHighlightsSection';
import { WebHighlightCard } from '@/web/components/WebHighlightCard';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

export type LibraryHighlightDetailProps = {
  highlight: WebHighlight;
  related: RelatedHighlightRow[];
  readOnly?: boolean;
  activeTagFilters?: string[];
  onBack: () => void;
  /** Build `/library?…&highlight=` href for a related row. */
  relatedHrefFor: (id: string) => string;
  onOpenRelated: (id: string, rank: number, reason: string) => void;
  onOpenPage?: (domain: string, path: string) => void;
  onToggleTagFilter?: (tag: string) => void;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
};

export function LibraryHighlightDetail({
  highlight,
  related,
  readOnly = false,
  activeTagFilters,
  onBack,
  relatedHrefFor,
  onOpenRelated,
  onOpenPage,
  onToggleTagFilter,
  onNoteSave,
  onTagsChange,
  onDelete,
}: LibraryHighlightDetailProps): React.ReactElement {
  return (
    <div
      className="lib-detail"
      data-od-id="library-highlight-detail"
      data-highlight-id={highlight.id}
    >
      <div className="lib-detail-bar">
        <button
          type="button"
          className="btn sm ghost"
          data-od-id="library-detail-back"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>
      <WebHighlightCard
        highlight={highlight}
        showDomain
        showMeta
        readOnly={readOnly}
        activeTagFilters={activeTagFilters}
        onOpenPage={onOpenPage}
        onToggleTagFilter={onToggleTagFilter}
        onNoteSave={onNoteSave}
        onTagsChange={onTagsChange}
        onDelete={onDelete}
      />
      <RelatedHighlightsSection
        items={related}
        hrefFor={relatedHrefFor}
        onOpen={onOpenRelated}
      />
    </div>
  );
}
