/**
 * @file RelatedTagsSection.tsx
 * @description Related tag chips above library results (single-tag filter context).
 */

import React from 'react';

import type { RelatedTagResult } from '@/shared/relatedness';

export type RelatedTagsSectionProps = {
  tags: RelatedTagResult[];
  onSelectTag: (tag: string, rank: number) => void;
};

/**
 * Soft-gated by caller: render only when `tags.length > 0`.
 */
export function RelatedTagsSection({
  tags,
  onSelectTag,
}: RelatedTagsSectionProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  return (
    <section
      className="related-block"
      data-od-id="related-tags"
      aria-label="Related tags"
    >
      <div className="related-block-head">
        <span className="u-kicker related-kicker">Related</span>
      </div>
      <div className="related-tag-row">
        {tags.map((t, rank) => (
          <button
            key={t.tag}
            type="button"
            className="hl-tag related-tag-chip"
            data-od-id={`related-tag-${t.tag.replace(/[^a-z0-9]+/gi, '-')}`}
            onClick={() => onSelectTag(t.tag, rank)}
          >
            {t.tag}
          </button>
        ))}
      </div>
    </section>
  );
}
