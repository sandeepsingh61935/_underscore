/**
 * @file RelatedPagesSection.tsx
 * @description Related library pages (cross-domain) above a page listing.
 */

import React from 'react';
import { Link } from 'react-router-dom';

import type { RelatedPageResult } from '@/shared/relatedness';
import { displaySectionPath } from '@/shared/utils/page-href';

export type RelatedPagesSectionProps = {
  pages: RelatedPageResult[];
  hrefFor: (domain: string, section: string) => string;
  onOpen: (domain: string, section: string, rank: number, reason: string) => void;
};

/**
 * Soft-gated by caller: render only when `pages.length > 0`.
 */
export function RelatedPagesSection({
  pages,
  hrefFor,
  onOpen,
}: RelatedPagesSectionProps): React.ReactElement | null {
  if (pages.length === 0) return null;

  return (
    <section
      className="related-block"
      data-od-id="related-pages"
      aria-label="Related pages"
    >
      <div className="related-block-head">
        <span className="u-kicker related-kicker">Related pages</span>
      </div>
      <ul className="related-page-list">
        {pages.map((row, rank) => {
          const od = `related-page-${row.domain}-${row.section}`.replace(
            /[^a-z0-9]+/gi,
            '-'
          );
          const count =
            row.highlightCount === 1 ? '1 highlight' : `${row.highlightCount} highlights`;
          return (
            <li key={`${row.domain}${row.section}`}>
              <Link
                to={hrefFor(row.domain, row.section)}
                className="related-page-row"
                data-od-id={od}
                title={`${row.domain}${row.section}`}
                onClick={() => onOpen(row.domain, row.section, rank, row.reason)}
              >
                <span className="related-page-host u-serif">{row.domain}</span>
                <span className="related-page-src u-mono" title={row.section}>
                  {displaySectionPath(row.section)}
                </span>
                <span className="related-page-count u-mono">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
