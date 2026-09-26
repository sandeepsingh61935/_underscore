import React, { useState } from 'react';

import type { RelatedPageResult } from '@/shared/relatedness';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import type { WebClientKind } from '@/web/lib/classify-web-client';

import { phoneHighlightHref } from './phoneHighlightHref';
import { PhoneRelatedPages } from './PhoneRelatedPages';

export function PhoneQuoteScreen({
  highlight,
  clientKind = 'phone',
  relatedPages = [],
  relatedLabel = 'Related pages',
  onOpenRelatedPage,
}: {
  highlight: WebHighlight;
  clientKind?: WebClientKind;
  relatedPages?: RelatedPageResult[];
  relatedLabel?: string;
  onOpenRelatedPage?: (
    domain: string,
    section: string,
    rank: number,
    reason: string
  ) => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const href = phoneHighlightHref(highlight);
  const note = (highlight.note ?? '').trim();
  const path = highlight.path && highlight.path !== '/' ? highlight.path : '';

  return (
    <section className="phone-quote" data-od-id="phone-quote">
      <p className="phone-quote-source">{highlight.domain}</p>
      <p className="phone-quote-text">{highlight.quote}</p>
      {path ? <p className="phone-quote-meta">{path}</p> : null}
      {note ? (
        <div className="phone-note" data-od-id="phone-quote-note">
          <span className="phone-note-kicker">Note</span>
          {note}
        </div>
      ) : null}
      {highlight.tags.length > 0 ? (
        <div className="phone-tags">
          {highlight.tags.map((tag) => (
            <span key={tag} className="phone-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {onOpenRelatedPage ? (
        <PhoneRelatedPages
          label={relatedLabel}
          pages={relatedPages}
          layout="vertical"
          onOpen={onOpenRelatedPage}
        />
      ) : null}
      <div className="phone-quote-actions">
        {href ? (
          <a
            className="btn primary"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('highlight_open_source', { client: clientKind })}
          >
            Open
          </a>
        ) : null}
        <button
          type="button"
          className="btn"
          onClick={() => {
            const text = href ?? highlight.quote;
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
