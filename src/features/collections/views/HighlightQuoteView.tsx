import React, { useEffect, useMemo, useState } from 'react';

import { useLibraryRelatednessService } from '@/features/collections/hooks/useLibraryRelatedness';
import type { OpenedHighlight } from '@/features/collections/opened-highlight';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { displaySectionPath } from '@/shared/utils/page-href';
import { openExternalUrl } from '@/shared/utils/open-external-url';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';

type RelatednessDoc = {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  notes?: string;
  tags?: string[];
};

function shortLeaf(section: string): string {
  const shown = displaySectionPath(section).replace(/\?…$/, '');
  const leaf = shown.split('/').filter(Boolean).pop() ?? shown;
  if (leaf.length <= 22) return leaf;
  return `${leaf.slice(0, 20)}…`;
}

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

  return (
    <section className="quote-detail" data-od-id="extension-quote">
      <div className="quote-detail-scroll">
        <p className="quote-detail-domain">{highlight.domain}</p>
        <p className="quote-detail-text">{highlight.text}</p>
        {path ? <p className="quote-detail-path">{displaySectionPath(path)}</p> : null}
        {note ? (
          <div className="quote-detail-note">
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
          <section className="quote-detail-related" aria-label="Related pages">
            <p className="quote-detail-kicker">Related pages</p>
            <div className="quote-detail-rail">
              {related.map((page) => (
                <button
                  key={`${page.domain}${page.section}`}
                  type="button"
                  className="quote-detail-card"
                  onClick={() => onOpenSection?.(page.domain, page.section)}
                >
                  <span className="quote-detail-host">{page.domain}</span>
                  <span className="quote-detail-leaf">{shortLeaf(page.section)}</span>
                  <span className="quote-detail-saved">{page.highlightCount} saved</span>
                </button>
              ))}
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
