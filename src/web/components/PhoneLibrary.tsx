import React, { useMemo } from 'react';

import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import type { WebClientKind } from '@/web/lib/classify-web-client';

import { PhoneDomainRow } from './PhoneDomainRow';
import { PhoneQuoteScreen } from './PhoneQuoteScreen';

export type PhoneLibraryProps = {
  highlights: WebHighlight[];
  query: string;
  onQueryChange: (q: string) => void;
  domain: string | null;
  highlightId: string | null;
  onOpenDomain: (domain: string) => void;
  onOpenHighlight: (id: string) => void;
  onBack: () => void;
  clientKind: WebClientKind;
};

type DomainGroup = {
  domain: string;
  count: number;
  highlights: WebHighlight[];
};

function groupByDomain(highlights: WebHighlight[]): DomainGroup[] {
  const map = new Map<string, WebHighlight[]>();
  for (const h of highlights) {
    const list = map.get(h.domain);
    if (list) {
      list.push(h);
    } else {
      map.set(h.domain, [h]);
    }
  }
  return [...map.entries()]
    .map(([domain, hls]) => ({
      domain,
      count: hls.length,
      highlights: hls,
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

function filterByQuery(groups: DomainGroup[], query: string): DomainGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((g) => {
    // Match domain name
    if (g.domain.toLowerCase().includes(q)) return true;
    // Match any quote text in the domain
    return g.highlights.some((h) => h.quote.toLowerCase().includes(q));
  });
}

export function PhoneLibrary({
  highlights,
  query,
  onQueryChange,
  domain,
  highlightId,
  onOpenDomain,
  onOpenHighlight,
  onBack,
  clientKind,
}: PhoneLibraryProps): React.ReactElement {
  const groups = useMemo(() => groupByDomain(highlights), [highlights]);

  // Quote screen mode
  if (domain && highlightId) {
    const highlight = highlights.find((h) => h.id === highlightId);
    if (highlight) {
      return (
        <PhoneQuoteScreen
          highlight={highlight}
          onBack={onBack}
          clientKind={clientKind}
        />
      );
    }
  }

  // Domain quotes mode
  if (domain) {
    const domainHighlights = highlights
      .filter((h) => h.domain === domain)
      .sort((a, b) => b.savedAt - a.savedAt);

    return (
      <section className="phone-library" data-od-id="phone-library-quotes">
        <button type="button" className="phone-back" onClick={onBack}>
          Back
        </button>
        <h2 className="phone-library-title">{domain}</h2>
        {domainHighlights.length === 0 ? (
          <p className="phone-empty">No highlights for this domain.</p>
        ) : (
          <div className="phone-quote-list">
            {domainHighlights.map((h) => (
              <button
                key={h.id}
                type="button"
                className="phone-quote-row"
                onClick={() => onOpenHighlight(h.id)}
              >
                <span className="phone-quote-row-text">{h.quote}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Domain list mode
  const filtered = filterByQuery(groups, query);

  return (
    <section className="phone-library" data-od-id="phone-library-domains">
      <h2 className="phone-library-title">Library</h2>
      <input
        type="search"
        className="phone-search"
        placeholder="Search highlights…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        data-od-id="phone-library-search"
      />
      {highlights.length === 0 ? (
        <p className="phone-empty">
          No highlights yet. Highlight on desktop with the extension.
        </p>
      ) : filtered.length === 0 ? (
        <p className="phone-empty">No matches.</p>
      ) : (
        <div className="phone-domain-list">
          {filtered.map((g) => (
            <PhoneDomainRow
              key={g.domain}
              domain={g.domain}
              count={g.count}
              onClick={() => onOpenDomain(g.domain)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
