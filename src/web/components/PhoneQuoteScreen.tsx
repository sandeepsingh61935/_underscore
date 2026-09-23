import React, { useState } from 'react';

import { pageHrefForLibrary } from '@/shared/utils/page-href';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import type { WebClientKind } from '@/web/lib/classify-web-client';

export function PhoneQuoteScreen({
  highlight,
  onBack,
  clientKind = 'phone',
}: {
  highlight: WebHighlight;
  onBack: () => void;
  clientKind?: WebClientKind;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const pageUrl = pageHrefForLibrary(highlight.domain, highlight.path);
  const href = pageUrl
    ? buildTextFragmentUrl(pageUrl, { exact: highlight.quote })
    : null;

  return (
    <section className="phone-quote" data-od-id="phone-quote">
      <button type="button" className="phone-back" onClick={onBack}>
        Back
      </button>
      <p className="phone-quote-text">{highlight.quote}</p>
      <p className="phone-quote-meta">
        {highlight.domain}
        {highlight.path ? ` ${highlight.path}` : ''}
      </p>
      <div className="phone-quote-actions">
        {href ? (
          <a
            className="btn sm"
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
          className="btn sm ghost"
          onClick={() => {
            if (!href || !navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(href).then(() => {
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
