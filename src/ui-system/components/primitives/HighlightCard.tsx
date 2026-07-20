/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (V2_HighlightCard)
 * Quote text is immutable (website capture). Users style via presentation tools.
 * @see docs/superpowers/specs/2026-07-14-highlight-markdown-body-design.md
 */
import React, { useState } from 'react';

import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';
import {
  HIGHLIGHT_PRESENTATION_FORMATS,
  PRESENTATION_FORMAT_LABELS,
  resolveHighlightPresentation,
  type HighlightPresentation,
  type HighlightPresentationFormat,
} from '@/shared/utils/highlight-presentation';

export interface HighlightCardProps {
  quote: string;
  domain: string;
  /** Raw URL path, e.g. "/docs/api". Omit for root. */
  section?: string;
  url?: string;
  density?: 'compact' | 'comfortable';
  onSectionClick?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  showLocationMeta?: boolean;
  footerStart?: React.ReactNode;
  /** Capture hint from page code block. */
  sourceKind?: 'code';
  language?: string;
  /** User presentation in the app (does not mutate quote). */
  presentation?: HighlightPresentation | null;
  /** Persist presentation only. */
  onPresentationChange?: (
    presentation: HighlightPresentation,
  ) => void | boolean | Promise<void | boolean>;
  /** Highlight id for format tools (optional label only). */
  highlightId?: string;
}

const actionBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  fontSize: 10,
  color: 'var(--accent)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '6px 2px',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
};

const formatBtnStyle = (active: boolean): React.CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  fontSize: 9,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '3px 6px',
  lineHeight: 1,
  color: active ? 'var(--paper)' : 'var(--ink-3)',
  background: active ? 'var(--ink)' : 'transparent',
  border: '1px solid var(--rule-soft)',
  borderRadius: 2,
});

export function HighlightCard({
  quote,
  domain,
  section,
  density = 'comfortable',
  onSectionClick,
  onCopy,
  onDelete,
  showLocationMeta = true,
  footerStart,
  sourceKind,
  language,
  presentation,
  onPresentationChange,
}: HighlightCardProps): React.ReactElement {
  const padTop = density === 'compact' ? 10 : 12;
  const padBottom = 8;
  const [metaHover, setMetaHover] = useState(false);
  const [formatBusy, setFormatBusy] = useState(false);

  const resolved = resolveHighlightPresentation({
    sourceKind,
    language,
    presentation,
  });

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

  const hasTileActions = Boolean(onCopy || onDelete || onPresentationChange);
  const showActionRow = hasTileActions || footerStart != null;

  const applyFormat = async (format: HighlightPresentationFormat): Promise<void> => {
    if (!onPresentationChange || formatBusy) return;
    setFormatBusy(true);
    try {
      await onPresentationChange({
        format,
        language:
          format === 'code'
            ? (presentation?.language ?? language)
            : presentation?.language,
      });
    } finally {
      setFormatBusy(false);
    }
  };

  return (
    <div
      style={{
        padding: `${padTop}px 16px ${padBottom}px`,
        borderBottom: '1px solid var(--rule-soft)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>
          &quot;
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HighlightMarkdownBody
            source={quote}
            clamp
            sourceKind={sourceKind}
            language={language}
            presentation={presentation}
          />

          {showLocationMeta && (
            <div style={{ marginTop: 6, marginBottom: showActionRow ? 6 : 0 }}>
              {onSectionClick ? (
                <button
                  type="button"
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
              )}
            </div>
          )}

          {onPresentationChange && (
            <div
              data-testid="highlight-format-toolbar"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                marginTop: 6,
                marginBottom: showActionRow ? 4 : 0,
              }}
              role="group"
              aria-label="Quote presentation"
            >
              {HIGHLIGHT_PRESENTATION_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  className="u-mono"
                  disabled={formatBusy}
                  aria-pressed={resolved.format === format}
                  onClick={(e) => {
                    e.stopPropagation();
                    void applyFormat(format);
                  }}
                  style={formatBtnStyle(resolved.format === format)}
                >
                  {PRESENTATION_FORMAT_LABELS[format]}
                </button>
              ))}
            </div>
          )}

          {showActionRow && (
            <div
              data-testid="highlight-action-row"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                minHeight: 28,
                marginTop: showLocationMeta || onPresentationChange ? 0 : 6,
              }}
            >
              {footerStart != null && (
                <div
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  {footerStart}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  marginLeft: footerStart != null ? undefined : 'auto',
                  paddingTop: 2,
                }}
              >
                {onCopy && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy();
                    }}
                    className="u-mono"
                    aria-label="Copy highlight text"
                    style={actionBtnStyle}
                  >
                    Copy
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="u-mono"
                    aria-label="Delete highlight"
                    style={actionBtnStyle}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
