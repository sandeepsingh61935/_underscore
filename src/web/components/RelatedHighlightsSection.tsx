/**
 * @file RelatedHighlightsSection.tsx
 * @description Compact related-highlight rows with reason pills (detail surface).
 * Rows are real in-app links to highlight detail so click / middle-click / open-in-tab work.
 */

import React from 'react';
import { Link } from 'react-router-dom';

import type { RelatedHighlightResult } from '@/shared/relatedness';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

export type RelatedHighlightRow = RelatedHighlightResult & {
  highlight: WebHighlight;
};

export type RelatedHighlightsSectionProps = {
  items: RelatedHighlightRow[];
  /** In-app library detail path for a highlight id (e.g. `/library?highlight=…`). */
  hrefFor: (id: string) => string;
  onOpen: (id: string, rank: number, reason: string) => void;
};

function snippet(quote: string, max = 120): string {
  const t = quote.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Soft-gated by caller: render only when items exist (or caller prefers honest empty).
 * Score-0 / empty candidate sets → hidden (return null).
 */
export function RelatedHighlightsSection({
  items,
  hrefFor,
  onOpen,
}: RelatedHighlightsSectionProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section
      className="related-block"
      data-od-id="related-highlights"
      aria-label="Related highlights"
    >
      <div className="related-block-head">
        <span className="u-kicker related-kicker">Related</span>
      </div>
      <ul className="related-hl-list">
        {items.map((row, rank) => {
          const h = row.highlight;
          return (
            <li key={row.id} className="related-hl-item">
              <Link
                to={hrefFor(row.id)}
                className="related-hl-row"
                data-od-id={`related-hl-${row.id}`}
                onClick={() => onOpen(row.id, rank, row.reason)}
              >
                <span className="related-hl-quote u-serif">
                  “{snippet(h.quote || (h.encrypted ? 'Encrypted highlight' : ''))}”
                </span>
                <span className="related-hl-meta">
                  {h.tags.length > 0 ? (
                    <span className="related-hl-tags u-mono">
                      {h.tags.slice(0, 3).join(' · ')}
                    </span>
                  ) : (
                    <span className="related-hl-src u-mono">
                      {h.domain}
                      {h.path && h.path !== '/' ? h.path : ''}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
