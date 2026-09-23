import React from 'react';

import type { WebHighlight } from '@/web/hooks/useWebLibrary';

export type PhoneHomeProps = {
  greeting: string;
  count: number;
  recent: WebHighlight[];
  onOpenHighlight: (id: string, domain: string) => void;
};

export function PhoneHome({
  greeting,
  count,
  recent,
  onOpenHighlight,
}: PhoneHomeProps): React.ReactElement {
  return (
    <section className="phone-home" data-od-id="phone-home">
      <h1 className="phone-home-greeting">{greeting}</h1>
      <p className="phone-count">
        {count} highlight{count === 1 ? '' : 's'}
      </p>
      {recent.length === 0 ? (
        <p className="phone-empty">
          No highlights yet. Highlight on desktop with the extension.
        </p>
      ) : (
        <div className="phone-recent-list">
          {recent.map((h) => (
            <button
              key={h.id}
              type="button"
              className="phone-quote-row"
              onClick={() => onOpenHighlight(h.id, h.domain)}
            >
              <span className="phone-quote-row-text">{h.quote}</span>
              <span className="phone-quote-meta">{h.domain}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
