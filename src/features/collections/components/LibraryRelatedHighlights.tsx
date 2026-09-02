/**
 * Popup-safe related highlights under an expanded tile.
 */
import React from 'react';

import type { RelatedHighlightResult } from '@/shared/relatedness';

export type LibraryRelatedHighlightRow = RelatedHighlightResult & {
  text: string;
  domain: string;
  path?: string;
};

export type LibraryRelatedHighlightsProps = {
  items: LibraryRelatedHighlightRow[];
  onOpen: (id: string) => void;
};

function snippet(quote: string, max = 100): string {
  const t = quote.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function LibraryRelatedHighlights({
  items,
  onOpen,
}: LibraryRelatedHighlightsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section
      data-testid="library-related-highlights"
      aria-label="Related highlights"
      style={{
        margin: '0 16px 10px',
        padding: '10px 12px',
        border: '1px solid var(--rule-soft)',
        background: 'var(--paper-2)',
      }}
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
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {items.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row.id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="u-serif"
                style={{
                  fontSize: 'var(--step--1)',
                  color: 'var(--ink)',
                  lineHeight: 1.35,
                }}
              >
                &ldquo;{snippet(row.text)}&rdquo;
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <span
                  className="u-mono"
                  style={{
                    fontSize: 'var(--step--2)',
                    color: 'var(--ink-3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {row.domain}
                  {row.path && row.path !== '/' ? row.path : ''}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
