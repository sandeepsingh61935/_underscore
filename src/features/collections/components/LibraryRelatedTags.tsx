/**
 * Popup-safe related tag chips (inline Editorial styles — no web OD classes).
 */
import React from 'react';

import type { RelatedTagResult } from '@/shared/relatedness';

export type LibraryRelatedTagsProps = {
  tags: RelatedTagResult[];
  onSelectTag: (tag: string) => void;
};

export function LibraryRelatedTags({
  tags,
  onSelectTag,
}: LibraryRelatedTagsProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  return (
    <section
      data-testid="library-related-tags"
      aria-label="Related tags"
      style={{ padding: '8px 16px 4px' }}
    >
      <div
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 8,
        }}
      >
        Related
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map((t) => (
          <button
            key={t.tag}
            type="button"
            className="u-mono"
            onClick={() => onSelectTag(t.tag)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              height: 22,
              padding: '0 8px',
              alignItems: 'center',
              border: '1px solid var(--rule-soft)',
              borderRadius: 99,
              fontSize: 'var(--step--2)',
              letterSpacing: '0.04em',
              color: 'var(--ink-2)',
              background: 'var(--paper-2)',
            }}
          >
            {t.tag}
          </button>
        ))}
      </div>
    </section>
  );
}
