import React from 'react';

import type { RelatedPageResult } from '@/shared/relatedness';
import { displaySectionPath } from '@/shared/utils/page-href';
import { DomainFavicon } from '@/web/components/DomainFavicon';

function shortLeaf(section: string): string {
  const shown = displaySectionPath(section).replace(/\?…$/, '');
  const leaf = shown.split('/').filter(Boolean).pop() ?? shown;
  if (leaf.length <= 22) return leaf;
  return `${leaf.slice(0, 20)}…`;
}

export type PhoneRelatedPagesProps = {
  label?: string;
  pages: RelatedPageResult[];
  layout?: 'rail' | 'vertical';
  onOpen: (domain: string, section: string, rank: number, reason: string) => void;
};

export function PhoneRelatedPages({
  label = 'Related pages',
  pages,
  layout = 'rail',
  onOpen,
}: PhoneRelatedPagesProps): React.ReactElement | null {
  if (pages.length === 0) return null;

  if (layout === 'vertical') {
    return (
      <section
        className="phone-related phone-related--vertical"
        data-od-id="phone-related-pages"
        aria-label="Related pages"
      >
        <p className="phone-kicker">{label}</p>
        <div className="phone-related-list" data-od-id="phone-related-list">
          {pages.map((page, rank) => {
            const count =
              page.highlightCount === 1 ? '1 highlight' : `${page.highlightCount} highlights`;
            const sectionLabel = displaySectionPath(page.section);
            return (
              <button
                key={`${page.domain}${page.section}`}
                type="button"
                className="phone-related-row"
                aria-label={`${page.domain}, ${sectionLabel}, ${count}`}
                onClick={() => onOpen(page.domain, page.section, rank, page.reason)}
              >
                <DomainFavicon domain={page.domain} className="phone-related-ico" size={16} />
                <div className="phone-related-info">
                  <div className="phone-related-host-line">
                    <span className="phone-related-host">{page.domain}</span>
                    {page.reason ? (
                      <span className="phone-related-reason">{page.reason}</span>
                    ) : null}
                  </div>
                  <span className="phone-related-path">{sectionLabel}</span>
                </div>
                <span className="phone-related-count">{page.highlightCount}</span>
                <span className="phone-related-trail" aria-hidden="true">
                  →
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="phone-related" data-od-id="phone-related-pages" aria-label="Related pages">
      <p className="phone-kicker">{label}</p>
      <div className="phone-related-rail">
        {pages.map((page, rank) => {
          const count =
            page.highlightCount === 1 ? '1 highlight' : `${page.highlightCount} highlights`;
          return (
            <button
              key={`${page.domain}${page.section}`}
              type="button"
              className="phone-related-card"
              aria-label={`${page.domain}, ${shortLeaf(page.section)}, ${count}`}
              onClick={() => onOpen(page.domain, page.section, rank, page.reason)}
            >
              <span className="phone-related-host">{page.domain}</span>
              <span className="phone-related-path">{shortLeaf(page.section)}</span>
              <span className="phone-related-count">{page.highlightCount} saved</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
