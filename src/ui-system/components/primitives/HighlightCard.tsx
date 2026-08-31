/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (V2_HighlightCard)
 * V2 contract:
 *   - Background var(--paper), border-bottom 1px var(--rule-soft).
 *   - Density: compact 10/8 pad; comfortable 12/8 (asymmetric — kill bottom waste).
 *   - Quote: markdown body via HighlightMarkdownBody (serif + mono for code).
 *   - Meta: u-mono, 10px, --ink-3, "domain" or "domain/path".
 *   - Optional footerStart: notes/tags on the same row as Edit/Copy/Delete.
 *   - Optional onSaveQuote: Edit → format tools + source + preview → Save/Cancel.
 *   - Format tools (Edit only) write markdown into the draft — not display modes.
 *   - Editor shortcuts: Ctrl/Cmd+B / I / E / Shift+K (fence+pretty).
 * @see docs/superpowers/specs/2026-07-14-highlight-markdown-body-design.md
 * @see docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 * @see docs/superpowers/specs/2026-07-20-highlight-edit-format-tools-prd.md
 */
import React, { useEffect, useRef, useState } from 'react';

import { discardEditsCopy } from '@/shared/utils/confirm-dialog-copy';
import {
  createEditHistory,
  pushEditHistory,
  redoEdit,
  undoEdit,
  type EditHistory,
  type EditSnapshot,
} from '@/shared/utils/edit-history';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { HIGHLIGHT_TEXT_MAX_LENGTH } from '@/shared/utils/highlight-text';
import {
  applyMarkdownFormatAction,
  applyMarkdownShortcut,
  type MarkdownFormatAction,
} from '@/shared/utils/markdown-wrap';
import { Dialog } from '@/ui-system/components/primitives/Dialog';
import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';

export interface HighlightCardProps {
  quote: string;
  domain: string;
  /** Raw URL path, e.g. "/docs/api". Omit for root. */
  section?: string;
  url?: string;
  density?: 'compact' | 'comfortable';
  onSectionClick?: () => void;
  onCopy?: () => void;
  /** Open source URL (home Recent stream). */
  onOpen?: () => void;
  onDelete?: () => void;
  /**
   * When provided, shows Edit and enables inline markdown source editor.
   * Return true on success (card exits edit mode).
   */
  onSaveQuote?: (text: string) => Promise<boolean>;
  showLocationMeta?: boolean;
  footerStart?: React.ReactNode;
  /**
   * When search is active and the hit is not pure-quote, show a compact
   * field badge under the action row (e.g. "Notes · Tags", "Text · Tags").
   */
  matchBadge?: string | null;
  /** Capture hint from page code block (display default only). */
  sourceKind?: 'code';
  language?: string;
  /**
   * Legacy / capture display hint only. Not edited via UI chips —
   * format tools mutate markdown source instead.
   */
  presentation?: HighlightPresentation | null;
}

/** Quiet text for Save / Cancel while editing. */
const actionBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  fontSize: 10,
  color: 'var(--ink-3)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '6px 4px',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
};

function IconEdit(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCopy(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="5.5"
        y="5.5"
        width="7"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M3.5 10.5V3.5h7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDelete(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const formatBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  fontSize: 9,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '4px 7px',
  lineHeight: 1,
  color: 'var(--ink-2)',
  background: 'var(--paper)',
  border: '1px solid var(--rule-soft)',
  borderRadius: 2,
};

const FORMAT_TOOLS: ReadonlyArray<{
  action: MarkdownFormatAction;
  label: string;
  title: string;
}> = [
  { action: 'bold', label: 'B', title: 'Bold (Ctrl/Cmd+B)' },
  { action: 'italic', label: 'I', title: 'Italic (Ctrl/Cmd+I)' },
  {
    action: 'code',
    label: '`code`',
    title: 'Inline code (Ctrl/Cmd+E). Multi-line uses code block.',
  },
  {
    action: 'fence',
    label: 'Block',
    title: 'Code block + pretty-print (Ctrl/Cmd+Shift+K)',
  },
  { action: 'bullets', label: 'List', title: 'Bullet list' },
  { action: 'numbered', label: '1.', title: 'Numbered list' },
];

const historyBtnStyle = (enabled: boolean): React.CSSProperties => ({
  ...formatBtnStyle,
  color: enabled ? 'var(--ink-2)' : 'var(--ink-3)',
  opacity: enabled ? 1 : 0.45,
  cursor: enabled ? 'pointer' : 'default',
});

export function HighlightCard({
  quote,
  domain,
  section,
  density = 'comfortable',
  onSectionClick,
  onCopy,
  onOpen: _onOpen,
  onDelete,
  onSaveQuote,
  showLocationMeta = true,
  footerStart,
  matchBadge,
  sourceKind,
  language,
  presentation,
}: HighlightCardProps): React.ReactElement {
  const padTop = density === 'compact' ? 10 : 12;
  const padBottom = 8;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(quote);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Survives toolbar mousedown blur so format tools do not apply at 0,0. */
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const historyRef = useRef<EditHistory>(createEditHistory());
  /** Latest draft for history helpers without stale closures. */
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const rememberSelection = (el: HTMLTextAreaElement): void => {
    savedSelectionRef.current = {
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  };

  const syncHistoryFlags = (history: EditHistory): void => {
    setCanUndo(history.undo.length > 0);
    setCanRedo(history.redo.length > 0);
  };

  const resetHistory = (): void => {
    historyRef.current = createEditHistory();
    syncHistoryFlags(historyRef.current);
  };

  const currentSnapshot = (): EditSnapshot => ({
    text: draftRef.current,
    selStart: savedSelectionRef.current.start,
    selEnd: savedSelectionRef.current.end,
  });

  const commitDraft = (next: string, selStart: number, selEnd: number): void => {
    historyRef.current = pushEditHistory(historyRef.current, currentSnapshot(), next);
    syncHistoryFlags(historyRef.current);
    setDraft(next);
    savedSelectionRef.current = { start: selStart, end: selEnd };
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
      rememberSelection(el);
    });
  };

  const applySnapshot = (snapshot: EditSnapshot): void => {
    setDraft(snapshot.text);
    savedSelectionRef.current = { start: snapshot.selStart, end: snapshot.selEnd };
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const max = snapshot.text.length;
      const a = Math.max(0, Math.min(snapshot.selStart, max));
      const b = Math.max(0, Math.min(snapshot.selEnd, max));
      el.setSelectionRange(a, b);
      rememberSelection(el);
    });
  };

  const handleUndo = (): void => {
    const result = undoEdit(historyRef.current, currentSnapshot());
    if (!result) return;
    historyRef.current = result.history;
    syncHistoryFlags(result.history);
    applySnapshot(result.snapshot);
  };

  const handleRedo = (): void => {
    const result = redoEdit(historyRef.current, currentSnapshot());
    if (!result) return;
    historyRef.current = result.history;
    syncHistoryFlags(result.history);
    applySnapshot(result.snapshot);
  };

  useEffect(() => {
    if (!editing) {
      setDraft(quote);
      resetHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when leaving edit or quote identity while not editing
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
        resetHistory();
      }
    } finally {
      setSaving(false);
    }
  };

  const applyCancel = (): void => {
    setDraft(quote);
    setEditing(false);
    setDiscardOpen(false);
    resetHistory();
  };

  const handleCancel = (): void => {
    if (draft !== quote) {
      setDiscardOpen(true);
      return;
    }
    applyCancel();
  };

  const resolveFormatRange = (): { start: number; end: number } => {
    const el = textareaRef.current;
    const saved = savedSelectionRef.current;
    let rangeStart = saved.start;
    let rangeEnd = saved.end;
    if (el) {
      const liveStart = el.selectionStart;
      const liveEnd = el.selectionEnd;
      if (liveStart !== liveEnd) {
        rangeStart = liveStart;
        rangeEnd = liveEnd;
      } else if (document.activeElement === el) {
        if (saved.start !== saved.end) {
          rangeStart = saved.start;
          rangeEnd = saved.end;
        } else {
          rangeStart = liveStart;
          rangeEnd = liveEnd;
        }
      }
    }
    return { start: rangeStart, end: rangeEnd };
  };

  const runFormatAction = (action: MarkdownFormatAction): void => {
    const { start, end } = resolveFormatRange();
    const result = applyMarkdownFormatAction(draftRef.current, start, end, action);
    commitDraft(result.text, result.selStart, result.selEnd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const el = e.currentTarget;
    rememberSelection(el);
    const mod = e.metaKey || e.ctrlKey;
    if (mod) {
      const k = e.key.toLowerCase();
      // Undo: Ctrl/Cmd+Z (no shift). Redo: Ctrl/Cmd+Shift+Z or Ctrl+Y.
      if (k === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((k === 'z' && e.shiftKey) || (k === 'y' && !e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }
    }
    const result = applyMarkdownShortcut(
      draftRef.current,
      el.selectionStart,
      el.selectionEnd,
      e.key,
      {
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
      }
    );
    if (!result) return;
    e.preventDefault();
    commitDraft(result.text, result.selStart, result.selEnd);
  };

  const openEditor = (): void => {
    setDraft(quote);
    resetHistory();
    savedSelectionRef.current = { start: 0, end: 0 };
    setEditing(true);
  };

  const hasTileActions = Boolean(onSaveQuote || onCopy || onDelete) || editing;
  const showActionRow = hasTileActions || footerStart != null;

  const discardCopy = discardEditsCopy();

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
          {editing ? (
            <div>
              <div
                data-testid="highlight-format-toolbar"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginBottom: 8,
                  alignItems: 'center',
                }}
                role="toolbar"
                aria-label="Markdown format"
              >
                <button
                  type="button"
                  className="u-mono"
                  title="Undo (Ctrl/Cmd+Z)"
                  aria-label="Undo"
                  disabled={saving || !canUndo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUndo();
                  }}
                  style={historyBtnStyle(canUndo && !saving)}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="u-mono"
                  title="Redo (Ctrl/Cmd+Shift+Z)"
                  aria-label="Redo"
                  disabled={saving || !canRedo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRedo();
                  }}
                  style={historyBtnStyle(canRedo && !saving)}
                >
                  Redo
                </button>
                <span
                  aria-hidden
                  style={{
                    width: 1,
                    alignSelf: 'stretch',
                    background: 'var(--rule-soft)',
                    margin: '0 2px',
                  }}
                />
                {FORMAT_TOOLS.map((tool) => (
                  <button
                    key={tool.action}
                    type="button"
                    className="u-mono"
                    title={tool.title}
                    aria-label={tool.title}
                    disabled={saving}
                    onMouseDown={(e) => {
                      // Keep textarea selection; do not steal focus before click.
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      runFormatAction(tool.action);
                    }}
                    style={formatBtnStyle}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
              <label
                className="u-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}
              >
                Markdown
              </label>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  const next = e.target.value;
                  const el = e.target;
                  historyRef.current = pushEditHistory(
                    historyRef.current,
                    {
                      text: draftRef.current,
                      selStart: savedSelectionRef.current.start,
                      selEnd: savedSelectionRef.current.end,
                    },
                    next
                  );
                  syncHistoryFlags(historyRef.current);
                  setDraft(next);
                  rememberSelection(el);
                }}
                onSelect={(e) => rememberSelection(e.currentTarget)}
                onKeyUp={(e) => rememberSelection(e.currentTarget)}
                onMouseUp={(e) => rememberSelection(e.currentTarget)}
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
              <p
                className="u-mono"
                style={{
                  margin: '6px 0 0',
                  fontSize: 9,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                }}
              >
                Ctrl/Cmd+Z undo · Shift+Z redo · B bold · I italic · E code · Shift+K
                block
              </p>
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  border: '1px solid var(--rule-soft)',
                  background: 'var(--paper-2)',
                }}
              >
                <div
                  className="u-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    marginBottom: 6,
                  }}
                >
                  Preview
                </div>
                <HighlightMarkdownBody
                  source={draft || ' '}
                  clamp={false}
                  sourceKind={sourceKind}
                  language={language}
                  presentation={presentation}
                />
              </div>
            </div>
          ) : (
            <HighlightMarkdownBody
              source={quote}
              clamp
              sourceKind={sourceKind}
              language={language}
              presentation={presentation}
            />
          )}

          {showLocationMeta && (
            <div style={{ marginTop: 6, marginBottom: showActionRow ? 6 : 0 }}>
              {onSectionClick ? (
                <button
                  type="button"
                  onClick={onSectionClick}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    ...metaStyle,
                  }}
                  className="u-mono hover:underline focus-visible:underline"
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
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSave();
                      }}
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
                          openEditor();
                        }}
                        className="hl-icon"
                        aria-label="Edit highlight text"
                        title="Edit"
                      >
                        <IconEdit />
                      </button>
                    )}
                    {onCopy && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy();
                        }}
                        className="hl-icon"
                        aria-label="Copy highlight text"
                        title="Copy"
                      >
                        <IconCopy />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="hl-icon is-danger"
                        aria-label="Delete highlight"
                        title="Delete"
                      >
                        <IconDelete />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {matchBadge ? (
            <div
              data-testid="highlight-match-badge"
              className="u-mono"
              style={{
                fontSize: 10,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 4,
                paddingBottom: 2,
              }}
            >
              {matchBadge}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={discardCopy.title}
        hideCloseButton
        actions={
          <>
            <button
              type="button"
              onClick={() => setDiscardOpen(false)}
              data-testid="discard-keep-editing"
              style={{
                flex: 1,
                minHeight: 44,
                fontFamily: 'var(--sans)',
                fontSize: 'var(--step--1)',
                padding: '10px 12px',
                cursor: 'pointer',
                boxSizing: 'border-box',
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
              }}
            >
              {discardCopy.cancelLabel}
            </button>
            <button
              type="button"
              onClick={applyCancel}
              data-testid="discard-confirm"
              style={{
                flex: 1,
                minHeight: 44,
                fontFamily: 'var(--sans)',
                fontSize: 'var(--step--1)',
                padding: '10px 12px',
                cursor: 'pointer',
                boxSizing: 'border-box',
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: 'var(--paper)',
              }}
            >
              {discardCopy.confirmLabel}
            </button>
          </>
        }
      >
        <p
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 'var(--step--1)',
            lineHeight: 1.45,
            color: 'var(--ink-2)',
            margin: 0,
          }}
        >
          {discardCopy.message}
        </p>
        <p
          className="u-mono"
          style={{
            margin: '8px 0 0',
            fontSize: 'var(--step--2)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            lineHeight: 1.4,
          }}
        >
          {discardCopy.note}
        </p>
      </Dialog>
    </div>
  );
}
