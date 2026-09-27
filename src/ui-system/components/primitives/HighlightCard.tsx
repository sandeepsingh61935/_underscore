/**
 * Wireframe: src/ui-system/theme/global.css (HighlightCard)
 * Design contract:
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
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { discardEditsCopy } from '@/shared/utils/confirm-dialog-copy';
import {
  createEditHistory,
  pushEditHistory,
  redoEdit,
  undoEdit,
  type EditHistory,
  type EditSnapshot,
} from '@/shared/utils/edit-history';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { HIGHLIGHT_TEXT_MAX_LENGTH } from '@/shared/utils/highlight-text';
import {
  applyMarkdownFormatAction,
  applyMarkdownShortcut,
  type MarkdownFormatAction,
} from '@/shared/utils/markdown-wrap';
import { Dialog } from '@/ui-system/components/primitives/Dialog';
import {
  HighlightCopyIcon,
  HighlightDeleteIcon,
  HighlightLinkIcon,
  HighlightNoteIcon,
  HighlightOpenIcon,
  HighlightTagIcon,
} from '@/ui-system/components/primitives/HighlightActionIcons';
import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';

function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

export interface HighlightCardProps {
  quote: string;
  domain: string;
  /** Raw URL path, e.g. "/docs/api". Omit for root. */
  section?: string;
  url?: string;
  density?: 'compact' | 'comfortable';
  onSectionClick?: () => void;
  /** Opens the quote page. The quote body is the control; action buttons stay separate. */
  onQuoteClick?: () => void;
  onCopy?: () => void;
  onCopyQuoteLink?: () => void;
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
  /** When true, marks highlight as unanchored due to DOM drift */
  isUnanchored?: boolean;
  /** Callback to re-anchor highlight to current DOM selection */
  onReanchor?: () => void | Promise<void>;
  /** Whether re-anchoring is currently available (false if page has no selection) */
  canReanchor?: boolean;

  /** Saved note content */
  notes?: string;
  /** Saved tag labels */
  tags?: string[];
  /** Callback to persist updated note content */
  onSaveNotes?: (notes: string) => Promise<boolean>;
  /** Callback to persist updated tag list */
  onSaveTags?: (tags: string[]) => Promise<boolean>;
  /** Callback when clicking a tag pill */
  onToggleTagFilter?: (tag: string) => void;
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
  onQuoteClick,
  onCopy,
  onCopyQuoteLink,
  onOpen,
  onDelete,
  onSaveQuote,
  showLocationMeta = true,
  footerStart,
  matchBadge,
  sourceKind,
  language,
  presentation,
  isUnanchored = false,
  onReanchor,
  canReanchor = true,
  notes,
  tags,
  onSaveNotes,
  onSaveTags,
  onToggleTagFilter,
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

  const [noteEditing, setNoteEditing] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(notes ?? '');
  const [tagInput, setTagInput] = useState('');
  const [localTags, setLocalTags] = useState<string[]>(() =>
    tags ? normalizeHighlightTags(tags) : []
  );
  const [tagError, setTagError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagsRowRef = useRef<HTMLDivElement>(null);
  const noteFieldId = useId();
  const tagFieldId = useId();
  const tagsBusyRef = useRef(false);

  useEffect(() => {
    if (!noteEditing) setNoteDraft(notes ?? '');
  }, [notes, noteEditing]);

  useEffect(() => {
    if (tagsBusyRef.current || tagEditing) return;
    setLocalTags(tags ? normalizeHighlightTags(tags) : []);
    setTagError(null);
  }, [tags, tagEditing]);

  useEffect(() => {
    if (noteEditing) {
      const t = window.setTimeout(() => noteRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [noteEditing]);

  useEffect(() => {
    if (tagEditing) {
      const t = window.setTimeout(() => tagInputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [tagEditing]);

  useEffect(() => {
    if (!tagEditing) return undefined;
    let remove: (() => void) | undefined;
    const attachTimer = window.setTimeout(() => {
      const onDoc = (e: MouseEvent): void => {
        const el = tagsRowRef.current;
        if (el && !el.contains(e.target as Node)) {
          setTagEditing(false);
          setTagInput('');
          setTagError(null);
        }
      };
      document.addEventListener('mousedown', onDoc);
      remove = () => document.removeEventListener('mousedown', onDoc);
    }, 0);
    return () => {
      window.clearTimeout(attachTimer);
      remove?.();
    };
  }, [tagEditing]);

  const saveNote = useCallback(async () => {
    if (!onSaveNotes) return;
    const next = noteDraft.trim();
    const previousNote = notes ?? '';
    setNoteEditing(false);
    setSavingNote(false);
    const ok = await onSaveNotes(next);
    if (!ok) {
      setNoteDraft(next || previousNote);
      setNoteEditing(true);
    }
  }, [noteDraft, notes, onSaveNotes]);

  const cancelNote = useCallback(() => {
    setNoteDraft(notes ?? '');
    setNoteEditing(false);
  }, [notes]);

  const persistTags = useCallback(
    async (next: string[], previous: string[]): Promise<boolean> => {
      if (!onSaveTags) return false;
      if (tagsBusyRef.current) return false;
      tagsBusyRef.current = true;
      setTagError(null);
      setLocalTags(next);
      setSavingTags(false);
      try {
        const ok = await onSaveTags(next);
        if (!ok) {
          setLocalTags(previous);
          setTagError('Could not save tag. Try again.');
          return false;
        }
        return true;
      } catch {
        setLocalTags(previous);
        setTagError('Could not save tag. Try again.');
        return false;
      } finally {
        tagsBusyRef.current = false;
      }
    },
    [onSaveTags]
  );

  const addTag = useCallback(async () => {
    if (!onSaveTags || tagsBusyRef.current) return;
    const clean = normalizeTagInput(tagInput);
    if (!clean) {
      setTagError('Type a tag name first.');
      tagInputRef.current?.focus();
      return;
    }
    const previous = localTags;
    const next = normalizeHighlightTags([...localTags, clean]);
    if (next.length === previous.length) {
      if (previous.some((t) => tagKey(t) === tagKey(clean))) {
        setTagInput('');
        setTagError(null);
        return;
      }
      setTagError('Tag limit reached (10).');
      return;
    }
    setTagInput('');
    setTagError(null);
    const ok = await persistTags(next, previous);
    if (ok) {
      window.setTimeout(() => tagInputRef.current?.focus(), 0);
    } else {
      setTagInput(clean);
    }
  }, [localTags, onSaveTags, persistTags, tagInput]);

  const removeTag = useCallback(
    async (tag: string) => {
      if (!onSaveTags || tagsBusyRef.current) return;
      const previous = localTags;
      const next = normalizeHighlightTags(
        localTags.filter((t) => tagKey(t) !== tagKey(tag))
      );
      await persistTags(next, previous);
    },
    [localTags, onSaveTags, persistTags]
  );

  const startTagEdit = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!onSaveTags) return;
      setTagError(null);
      setTagEditing(true);
    },
    [onSaveTags]
  );

  const startNoteEdit = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!onSaveNotes) return;
      setNoteDraft(notes ?? '');
      setNoteEditing(true);
    },
    [notes, onSaveNotes]
  );

  const hasNote = Boolean(notes?.trim());
  const canNote = Boolean(onSaveNotes);
  const canTag = Boolean(onSaveTags);

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

  const hasTileActions =
    Boolean(
      onSaveQuote ||
      onCopy ||
      onCopyQuoteLink ||
      canNote ||
      canTag ||
      onOpen ||
      onDelete ||
      (isUnanchored && onReanchor)
    ) || editing;
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
            <div
              role={onQuoteClick ? 'button' : undefined}
              tabIndex={onQuoteClick ? 0 : undefined}
              onClick={onQuoteClick}
              onKeyDown={
                onQuoteClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onQuoteClick();
                      }
                    }
                  : undefined
              }
              style={onQuoteClick ? { cursor: 'pointer' } : undefined}
            >
              <HighlightMarkdownBody
                source={quote}
                clamp
                sourceKind={sourceKind}
                language={language}
                presentation={presentation}
              />
            </div>
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

          {isUnanchored && (
            <div style={{ marginTop: 6, marginBottom: showActionRow ? 6 : 0 }}>
              <span
                data-testid="highlight-unanchored-pill"
                className="u-mono"
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  lineHeight: 1.2,
                  letterSpacing: '0.04em',
                  padding: '2px 6px',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink-3)',
                  background: 'var(--paper-2)',
                  borderRadius: 2,
                  textTransform: 'uppercase',
                }}
              >
                Unanchored (Page modified)
              </span>
            </div>
          )}

          {hasNote && !noteEditing ? (
            <div
              className="hl-note"
              role={canNote ? 'button' : undefined}
              tabIndex={canNote ? 0 : undefined}
              onClick={canNote ? () => startNoteEdit() : undefined}
              onKeyDown={
                canNote
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startNoteEdit();
                      }
                    }
                  : undefined
              }
            >
              <span className="hl-note-kicker">Note</span>
              <p className="hl-note-txt">{notes?.trim()}</p>
            </div>
          ) : null}

          {noteEditing && canNote ? (
            <div className="hl-note-edit">
              <label className="hl-note-kicker" htmlFor={noteFieldId}>
                Note
              </label>
              <textarea
                id={noteFieldId}
                ref={noteRef}
                className="hl-note-input"
                rows={3}
                placeholder="Add a note…"
                aria-label="Note"
                value={noteDraft}
                disabled={savingNote}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelNote();
                }}
              />
              <div className="hl-note-actions">
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={savingNote}
                  onClick={cancelNote}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn sm"
                  disabled={savingNote}
                  onClick={() => void saveNote()}
                >
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : null}

          {localTags.length > 0 || tagEditing ? (
            <div
              className="hl-tags"
              ref={tagsRowRef}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {localTags.map((t) => {
                if (tagEditing && canTag) {
                  return (
                    <span key={t} className="hl-tag-chip">
                      <span>{t}</span>
                      <button
                        type="button"
                        className="hl-tag-rm"
                        aria-label={`Remove tag ${t}`}
                        disabled={savingTags}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void removeTag(t);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                }
                return (
                  <button
                    key={t}
                    type="button"
                    className="hl-tag"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleTagFilter?.(t);
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          ) : null}

          {tagEditing && canTag ? (
            <div className="hl-tag-edit">
              <input
                id={tagFieldId}
                ref={tagInputRef}
                className="hl-tag-input"
                placeholder="Add tag…"
                aria-label="New tag name"
                autoComplete="off"
                value={tagInput}
                disabled={savingTags}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  if (tagError) setTagError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    void addTag();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setTagEditing(false);
                    setTagInput('');
                    setTagError(null);
                  }
                }}
              />
              <button
                type="button"
                className="btn sm"
                disabled={savingTags}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void addTag();
                }}
              >
                {savingTags ? 'Saving…' : 'Add'}
              </button>
            </div>
          ) : null}

          {tagError ? (
            <p className="hl-tag-error" role="alert">
              {tagError}
            </p>
          ) : null}

          {showActionRow && (
            <div
              data-testid="highlight-action-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 28,
                marginTop: 10,
                paddingTop: 4,
                borderTop: '1px solid var(--rule-soft)',
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
                        <HighlightCopyIcon />
                      </button>
                    )}
                    {onCopyQuoteLink && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyQuoteLink();
                        }}
                        className="hl-icon"
                        aria-label="Copy direct link to quote"
                        title="Copy quote link"
                      >
                        <HighlightLinkIcon />
                      </button>
                    )}
                    {canNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (noteEditing) {
                            cancelNote();
                          } else {
                            startNoteEdit();
                            setTagEditing(false);
                          }
                        }}
                        className={`hl-icon${noteEditing ? ' is-active' : ''}`}
                        aria-label={hasNote ? 'Edit note' : 'Add note'}
                        aria-pressed={noteEditing}
                        title={hasNote ? 'Edit note' : 'Add note'}
                      >
                        <HighlightNoteIcon />
                      </button>
                    )}
                    {canTag && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tagEditing) {
                            setTagEditing(false);
                            setTagInput('');
                            setTagError(null);
                          } else {
                            startTagEdit();
                            setNoteEditing(false);
                          }
                        }}
                        className={`hl-icon${tagEditing ? ' is-active' : ''}`}
                        aria-label="Add tags"
                        aria-pressed={tagEditing}
                        title="Add tags"
                      >
                        <HighlightTagIcon />
                      </button>
                    )}
                    {onOpen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen();
                        }}
                        className="hl-icon"
                        aria-label="Open highlight in browser tab"
                        title="Open in new tab"
                      >
                        <HighlightOpenIcon />
                      </button>
                    )}
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
                    {isUnanchored && onReanchor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onReanchor();
                        }}
                        disabled={canReanchor === false}
                        className="u-mono"
                        aria-label="Re-anchor to selection"
                        title={
                          canReanchor === false
                            ? 'Select text on the page first to re-anchor'
                            : 'Re-anchor to selection'
                        }
                        style={{
                          all: 'unset',
                          cursor: canReanchor === false ? 'not-allowed' : 'pointer',
                          padding: '3px 8px',
                          border: '1px solid var(--rule)',
                          background: 'transparent',
                          color: canReanchor === false ? 'var(--ink-4)' : 'var(--ink)',
                          opacity: canReanchor === false ? 0.45 : 1,
                          fontSize: 10,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginRight: 4,
                        }}
                      >
                        Re-anchor to selection
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
                        <HighlightDeleteIcon />
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
