/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L767-795 (V2_HighlightCard)
 * V2 contract:
 *   - Background var(--paper), border-bottom 1px var(--rule-soft).
 *   - Two densities: compact 10px / comfortable 14px vertical padding.
 *   - Quote: u-serif, 14px, --ink. qmark glyph 28px.
 *   - Meta: u-mono, 10px, --ink-3, "domain" or "domain/path".
 *   - Optional onSectionClick: makes meta line a tappable button (underline on hover).
 */
import React, { useState } from 'react';

export interface HighlightCardProps {
  quote: string;
  domain: string;
  /** Raw URL path, e.g. "/docs/api". Rendered directly after domain (no separator).
   *  Omit or pass undefined for root — shows domain only. */
  section?: string;
  url?: string;
  /** @deprecated Guest storage is permanent; TTL badges removed. */
  ttlMs?: number;
  density?: 'compact' | 'comfortable';
  /** When provided, the meta line (domain/path) becomes a tappable button. */
  onSectionClick?: () => void;
  /** When provided, shows a copy action for formatted markdown export. */
  onCopy?: () => void;
  /** When provided, shows a delete action (no confirm — undo via toast). */
  onDelete?: () => void;
  /** Show domain/path under the quote. Default true; hide on section drill-down views. */
  showLocationMeta?: boolean;
}

export function HighlightCard({
  quote,
  domain,
  section,
  density = 'comfortable',
  onSectionClick,
  onCopy,
  onDelete,
  showLocationMeta = true,
}: HighlightCardProps): React.ReactElement {
  const padY = density === 'compact' ? 10 : 14;
  const [metaHover, setMetaHover] = useState(false);

  const metaText = `${domain}${section ?? ''}`;

  const metaStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--ink-3)',
    letterSpacing: '0.04em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 220,
  };

  return (
    <div style={{ padding: `${padY}px 16px`, borderBottom: '1px solid var(--rule-soft)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>"</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-serif" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--ink)' }}>
            {quote}
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: showLocationMeta ? 'space-between' : 'flex-end',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            {showLocationMeta && (
              onSectionClick ? (
                <button
                  onClick={onSectionClick}
                  onMouseEnter={() => setMetaHover(true)}
                  onMouseLeave={() => setMetaHover(false)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    textDecoration: metaHover ? 'underline' : 'none',
                    ...metaStyle,
                  }}
                  className="u-mono"
                >
                  {metaText}
                </button>
              ) : (
                <div className="u-mono" style={metaStyle}>
                  {metaText}
                </div>
              )
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
            {onCopy && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCopy(); }}
                className="u-mono"
                aria-label="Copy highlight text"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Copy
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="u-mono"
                aria-label="Delete highlight"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Delete
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
