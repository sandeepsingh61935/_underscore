/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (V2_HighlightCard)
 * V2 contract:
 *   - Background var(--paper), border-bottom 1px var(--rule-soft).
 *   - Density: compact 10/8 pad; comfortable 12/8 (asymmetric — kill bottom waste).
 *   - Quote: markdown body via HighlightMarkdownBody (serif + mono for code).
 *   - Meta: u-mono, 10px, --ink-3, "domain" or "domain/path".
 *   - Optional footerStart: notes/tags on the same row as Edit/Copy/Delete.
 *   - Optional onSaveQuote: Edit → source + preview → Save/Cancel (Collections).
 *   - Editor shortcuts: Ctrl/Cmd+B / I / E / Shift+C (fence+pretty).
 * @see docs/superpowers/specs/2026-07-14-highlight-markdown-body-design.md
 * @see docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 */
import React, { useEffect, useRef, useState } from 'react';

import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';
import { applyMarkdownShortcut, fenceWrapPretty } from '@/shared/utils/markdown-wrap';
import { HIGHLIGHT_TEXT_MAX_LENGTH } from '@/shared/utils/highlight-text';

export interface HighlightCardProps {
  quote: string;
  domain: string;
  /** Raw URL path, e.g. "/docs/api". Rendered directly after domain (no separator).
   *  Omit or pass undefined for root — shows domain only. */
  section?: string;
  url?: string;
  density?: 'compact' | 'comfortable';
  /** When provided, the meta line (domain/path) becomes a tappable button. */
  onSectionClick?: () => void;
  /** When provided, shows a copy action for the markdown source. */
  onCopy?: () => void;
  /** When provided, shows a delete action (no confirm — undo via toast). */
  onDelete?: () => void;
  /**
   * When provided, shows Edit and enables inline markdown source editor.
   * Return true on success (card exits edit mode).
   */
  onSaveQuote?: (text: string) => Promise<boolean>;
  /** Show domain/path under the quote. Default true; hide on section drill-down views. */
  showLocationMeta?: boolean;
  /**
   * Leading content for the unified action row (notes/tags invite).
   * Renders on the same baseline as Edit / Copy / Delete.
   */
  footerStart?: React.ReactNode;
}

/** List-row text actions: tappable pad, not 44px full-row min-height. */
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

export function HighlightCard({
  quote,
  domain,
  section,
  density = 'comfortable',
  onSectionClick,
  onCopy,
  onDelete,
  onSaveQuote,
  showLocationMeta = true,
  footerStart,
}: HighlightCardProps): React.ReactElement {
  // Asymmetric pad: top keeps rhythm; bottom hugs content (PRD density).
  const padTop = density === 'compact' ? 10 : 12;
  const padBottom = 8;
  const [metaHover, setMetaHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(quote);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(quote);
    }
  }, [quote, editing]);

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

  const handleSave = async (): Promise<void> => {
    if (!onSaveQuote || saving) return;
    setSaving(true);
    try {
      const ok = await onSaveQuote(draft);
      if (ok) {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setDraft(quote);
    setEditing(false);
  };

  const applyWrapResult = (next: string, selStart: number, selEnd: number): void => {
    setDraft(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const el = e.currentTarget;
    const result = applyMarkdownShortcut(draft, el.selectionStart, el.selectionEnd, e.key, {
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
    });
    if (!result) return;
    e.preventDefault();
    applyWrapResult(result.text, result.selStart, result.selEnd);
  };

  const hasTileActions = Boolean(onSaveQuote || onCopy || onDelete) || editing;
  const showActionRow = hasTileActions || footerStart != null;

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
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>&quot;</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div>
              <label className="u-mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                Markdown
              </label>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={HIGHLIGHT_TEXT_MAX_LENGTH}
                aria-label="Edit highlight markdown"
                className="u-mono"
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 6,
                  minHeight: 140,
                  padding: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: 'var(--ink)',
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <p className="u-mono" style={{ margin: 0, fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                  Ctrl/Cmd+B bold · I italic · E code · Shift+K fence+pretty
                </p>
                <button
                  type="button"
                  className="u-mono"
                  aria-label="Wrap selection as code fence with pretty-print"
                  onClick={() => {
                    const el = textareaRef.current;
                    const start = el?.selectionStart ?? 0;
                    const end = el?.selectionEnd ?? 0;
                    const r = fenceWrapPretty(draft, start, end);
                    applyWrapResult(r.text, r.selStart, r.selEnd);
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 9,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    border: '1px solid var(--rule-soft)',
                    padding: '3px 6px',
                    lineHeight: 1,
                  }}
                >
                  Code wrap
                </button>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  border: '1px solid var(--rule-soft)',
                  background: 'var(--paper-2)',
                }}
              >
                <div className="u-mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                  Preview
                </div>
                <HighlightMarkdownBody source={draft || ' '} clamp={false} />
              </div>
            </div>
          ) : (
            <HighlightMarkdownBody source={quote} clamp />
          )}

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

          {showActionRow && (
            <div
              data-testid="highlight-action-row"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                minHeight: 28,
                marginTop: showLocationMeta ? 0 : 6,
              }}
            >
              {footerStart != null && (
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'flex-start' }}>
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
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { void handleSave(); }}
                      disabled={saving}
                      className="u-mono"
                      aria-label="Save highlight text"
                      style={{ ...actionBtnStyle, opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="u-mono"
                      aria-label="Cancel editing highlight"
                      style={actionBtnStyle}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {onSaveQuote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraft(quote);
                          setEditing(true);
                        }}
                        className="u-mono"
                        aria-label="Edit highlight text"
                        style={actionBtnStyle}
                      >
                        Edit
                      </button>
                    )}
                    {onCopy && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCopy(); }}
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
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="u-mono"
                        aria-label="Delete highlight"
                        style={actionBtnStyle}
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
