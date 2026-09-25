import React, { useEffect, useMemo, useState } from 'react';

import { useLibraryRelatednessService } from '@/features/collections/hooks/useLibraryRelatedness';
import type { OpenedHighlight } from '@/features/collections/opened-highlight';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { displaySectionPath } from '@/shared/utils/page-href';
import { openExternalUrl } from '@/shared/utils/open-external-url';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';
import { DomainFavicon } from '@/features/collections/components/DomainFavicon';

type RelatednessDoc = {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  notes?: string;
  tags?: string[];
};


function sourceHref(highlight: OpenedHighlight): string | null {
  const base = highlight.url || (highlight.domain ? `https://${highlight.domain}${highlight.path || ''}` : '');
  if (!base || !highlight.text) return null;
  return buildTextFragmentUrl(base, { exact: highlight.text });
}

/**
 * Quote page opened from a library highlight. Same reading layout as the phone quote screen.
 */
export function HighlightQuoteView({
  highlight,
  onOpenSection,
}: {
  highlight: OpenedHighlight;
  onOpenSection?: (domain: string, section: string) => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [corpus, setCorpus] = useState<RelatednessDoc[]>([]);
  const loadCorpus = useIpcAction<Record<string, never>, { docs: RelatednessDoc[] }>(
    'LIST_RELATEDNESS_DOCS'
  );
  useEffect(() => {
    let cancelled = false;
    void loadCorpus({}).then((result) => {
      if (cancelled || !result.success) return;
      setCorpus(result.data.docs ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [loadCorpus]);
  const relatedness = useLibraryRelatednessService(corpus);
  const related = useMemo(
    () => relatedness.relatedPages(highlight.domain, highlight.path || '/'),
    [relatedness, highlight.domain, highlight.path]
  );
  const href = sourceHref(highlight);
  const path = highlight.path && highlight.path !== '/' ? highlight.path : '';
  const note = highlight.notes?.trim() ?? '';
  const seedPath = highlight.path && highlight.path !== '/' ? highlight.path : null;
  const relatedLabel = seedPath ? `Related to ${displaySectionPath(seedPath)}` : 'Related pages';

  return (
    <section className="quote-detail" data-od-id="extension-quote">
      <div className="quote-detail-scroll">
        <p className="quote-detail-domain">{highlight.domain}</p>
        <p className="quote-detail-text">{highlight.text}</p>
        {path ? <p className="quote-detail-path">{displaySectionPath(path)}</p> : null}
        {note ? (
          <div className="quote-detail-note" data-testid="quote-detail-note">
            <span className="quote-detail-kicker">Your note</span>
            {note}
          </div>
        ) : null}
        {highlight.tags && highlight.tags.length > 0 ? (
          <div className="quote-detail-tags">
            {highlight.tags.map((tag) => (
              <span key={tag} className="quote-detail-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {related.length > 0 ? (
          <section
            className="quote-detail-related quote-detail-related--vertical"
            data-od-id="quote-detail-related"
            aria-label="Related pages"
          >
            <p className="quote-detail-kicker">{relatedLabel}</p>
            <div className="quote-detail-list">
              {related.map((page) => {
                const count =
                  page.highlightCount === 1 ? '1 highlight' : `${page.highlightCount} highlights`;
                const sectionLabel = displaySectionPath(page.section);
                return (
                  <button
                    key={`${page.domain}${page.section}`}
                    type="button"
                    className="quote-detail-row"
                    aria-label={`${page.domain}, ${sectionLabel}, ${count}`}
                    onClick={() => onOpenSection?.(page.domain, page.section)}
                  >
                    <DomainFavicon domain={page.domain} className="quote-detail-ico" size={16} />
                    <div className="quote-detail-info">
                      <div className="quote-detail-host-line">
                        <span className="quote-detail-host">{page.domain}</span>
                      </div>
                      <span className="quote-detail-path-sub">{sectionLabel}</span>
                    </div>
                    <span className="quote-detail-count">{page.highlightCount}</span>
                    <span className="quote-detail-trail" aria-hidden="true">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
      <div className="quote-detail-actions">
        {href ? (
          <button type="button" className="btn primary" onClick={() => openExternalUrl(href)}>
            Open
          </button>
        ) : null}
        <button
          type="button"
          className="btn"
          onClick={() => {
            const text = href ?? highlight.text;
            if (!navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </section>
  );
}
