/**
 * @file WebHighlightCard.tsx
 * @description OD-parity highlight card for the web app: quote/meta main region
 * plus tags/notes. Empty state: compact Tag/Note actions on the meta row
 * (no dashed fields). Foot only for chips, a saved note, or an open editor.
 * Persist via parent callbacks (useUpdateHighlightMetadata / library patch).
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { deleteHighlightCopy } from '@/shared/utils/confirm-dialog-copy';
import { formatHighlightWhen } from '@/shared/utils/format-highlight-when';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';
import { displaySectionPath, pageHrefForLibrary } from '@/shared/utils/page-href';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';
import {
  HighlightCopyIcon,
  HighlightLinkIcon,
  HighlightNoteIcon,
  HighlightTagIcon,
  HighlightOpenIcon,
  HighlightDeleteIcon,
} from '@/ui-system/components/primitives';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import type { WebClientKind } from '@/web/lib/classify-web-client';

export type WebHighlightCardProps = {
  highlight: WebHighlight;
  /** Show domain in meta (Library section views often hide it). */
  showDomain?: boolean;
  /** When false, omit path/time meta (OD library page list). */
  showMeta?: boolean;
  /**
   * `rail` = Home Recent: denser clamp, no empty add chrome (parent usually readOnly).
   * `default` = full Library card.
   */
  density?: 'default' | 'rail';
  matchBadge?: string | null;
  /** Guests / locked: display only, no edit affordances. */
  readOnly?: boolean;
  /** Active tag filters (lowercased compare) for chip active state. */
  activeTagFilters?: string[];
  onOpenPage?: (domain: string, path: string) => void;
  /** Prefer over onOpenPage when opening highlight detail. */
  onOpenHighlight?: (id: string) => void;
  /** Toggle a tag into the Library filter set. */
  onToggleTagFilter?: (tag: string) => void;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  /** Soft-delete this highlight after confirm. */
  onDelete?: (id: string) => Promise<boolean>;
  /** For consume analytics on source open. */
  clientKind?: WebClientKind;
};

function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}


export function WebHighlightCard({
  highlight: h,
  showDomain = true,
  showMeta = true,
  density = 'default',
  matchBadge,
  readOnly = false,
  activeTagFilters = [],
  onOpenPage,
  onOpenHighlight,
  onToggleTagFilter,
  onNoteSave,
  onTagsChange,
  onDelete,
  clientKind = 'desktop',
}: WebHighlightCardProps): React.ReactElement {
  const [noteEditing, setNoteEditing] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(h.note);
  const [tagInput, setTagInput] = useState('');
  /** Local tag list so add/remove feels instant; synced from props when idle. */
  const [localTags, setLocalTags] = useState<string[]>(() =>
    normalizeHighlightTags(h.tags)
  );
  const [tagError, setTagError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagsRowRef = useRef<HTMLDivElement>(null);
  const isDeletingRef = useRef(false);
  const noteFieldId = useId();
  const tagFieldId = useId();
  const tagsBusyRef = useRef(false);

  const handleCopyText = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(h.quote).then(() => {
          setCopiedText(true);
          setTimeout(() => setCopiedText(false), 2000);
        });
      }
    },
    [h.quote]
  );

  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const baseUrl = `https://${h.domain}${h.path || ''}`;
      const fragmentUrl = buildTextFragmentUrl(baseUrl, { exact: h.quote });
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(fragmentUrl).then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        });
      }
    },
    [h.domain, h.path, h.quote]
  );

  const activeSet = new Set(activeTagFilters.map(tagKey));
  const canEdit = !readOnly && Boolean(onNoteSave || onTagsChange);
  const canDelete = !readOnly && Boolean(onDelete);

  // Sync drafts when highlight id or server values change while not editing.
  useEffect(() => {
    if (!noteEditing) setNoteDraft(h.note);
  }, [h.id, h.note, noteEditing]);

  useEffect(() => {
    // Don't clobber in-flight optimistic tags.
    if (tagsBusyRef.current || tagEditing) return;
    setLocalTags(normalizeHighlightTags(h.tags));
    setTagError(null);
  }, [h.id, h.tags, tagEditing]);

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

  // Click outside tag editor closes it. Delay attach so the opening click
  // cannot immediately dismiss the editor.
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

  const openMain = useCallback(() => {
    if (onOpenHighlight) {
      onOpenHighlight(h.id);
      return;
    }
    onOpenPage?.(h.domain, h.path || '/');
  }, [h.domain, h.id, h.path, onOpenHighlight, onOpenPage]);

  const saveNote = useCallback(async () => {
    if (!onNoteSave) return;
    const next = noteDraft.trim();
    const previousNote = h.note;
    // Close editor immediately — parent patches library optimistically.
    setNoteEditing(false);
    setSavingNote(false);
    const ok = await onNoteSave(h.id, next);
    if (!ok) {
      // Network failed: restore draft and reopen so the user can retry.
      setNoteDraft(next || previousNote);
      setNoteEditing(true);
    }
  }, [h.id, h.note, noteDraft, onNoteSave]);

  const cancelNote = useCallback(() => {
    setNoteDraft(h.note);
    setNoteEditing(false);
  }, [h.note]);

  const persistTags = useCallback(
    async (next: string[], previous: string[]): Promise<boolean> => {
      if (!onTagsChange) return false;
      if (tagsBusyRef.current) return false;
      tagsBusyRef.current = true;
      setTagError(null);
      // Optimistic chip update — do not block the row on network RTT.
      setLocalTags(next);
      setSavingTags(false);
      try {
        const ok = await onTagsChange(h.id, next);
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
    [h.id, onTagsChange]
  );

  const addTag = useCallback(async () => {
    if (!onTagsChange || tagsBusyRef.current) return;
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
    // Clear input immediately so the next tag can be typed while save runs.
    setTagInput('');
    setTagError(null);
    const ok = await persistTags(next, previous);
    if (ok) {
      window.setTimeout(() => tagInputRef.current?.focus(), 0);
    } else {
      // Restore typed value on failure so the user can retry without retyping.
      setTagInput(clean);
    }
  }, [localTags, onTagsChange, persistTags, tagInput]);

  const removeTag = useCallback(
    async (tag: string) => {
      if (!onTagsChange || tagsBusyRef.current) return;
      const previous = localTags;
      const next = normalizeHighlightTags(
        localTags.filter((t) => tagKey(t) !== tagKey(tag))
      );
      await persistTags(next, previous);
    },
    [localTags, onTagsChange, persistTags]
  );

  const startTagEdit = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!canEdit || !onTagsChange) return;
      setTagError(null);
      setTagEditing(true);
    },
    [canEdit, onTagsChange]
  );

  const startNoteEdit = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!canEdit || !onNoteSave) return;
      setNoteDraft(h.note);
      setNoteEditing(true);
    },
    [canEdit, h.note, onNoteSave]
  );

  const note = h.note.trim();
  const tags = localTags;
  const deleteCopy = deleteHighlightCopy();

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!onDelete || isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeleting(true);
    try {
      const ok = await onDelete(h.id);
      if (ok) setDeleteOpen(false);
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }, [h.id, onDelete]);

  const isRail = density === 'rail';
  const pageUrl = pageHrefForLibrary(h.domain, h.path);
  const sourceHref = pageUrl
    ? buildTextFragmentUrl(pageUrl, { exact: h.quote })
    : null;
  const hasNote = Boolean(note);
  const canTag = Boolean(canEdit && onTagsChange);
  const canNote = Boolean(canEdit && onNoteSave);

  return (
    <div
      className={`hl${isRail ? ' hl--rail' : ''}`}
      data-od-id={`hl-${h.id}`}
      data-density={density}
    >
      <div className="hl-top">
        <div className="hl-main-col">
          <button
            type="button"
            className="hl-main"
            data-od-id={`hl-main-${h.id}`}
            onClick={openMain}
          >
            <p className="hl-quote">“{h.quote}”</p>
            {matchBadge ? <div className="match-badge">{matchBadge}</div> : null}
          </button>
          {showMeta ? (
            <div className="hl-meta">
              {showDomain ? <span className="src">{h.domain}</span> : null}
              {!isRail && h.path ? (
                sourceHref ? (
                  <a
                    className="hl-path hl-path-link"
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={h.path}
                    onClick={() => {
                      trackEvent('highlight_open_source', { client: clientKind });
                    }}
                  >
                    {displaySectionPath(h.path)}
                  </a>
                ) : (
                  <span className="hl-path" title={h.path}>
                    {displaySectionPath(h.path)}
                  </span>
                )
              ) : null}
              <span>{formatHighlightWhen(h.savedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasNote && !noteEditing ? (
        <div
          className="hl-note"
          data-od-id={`hl-note-${h.id}`}
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
          onClick={canEdit ? () => startNoteEdit() : undefined}
          onKeyDown={
            canEdit
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    startNoteEdit();
                  }
                }
              : undefined
          }
        >
          <span className="hl-note-kicker">YOUR NOTE</span>
          <p className="hl-note-txt">{note}</p>
        </div>
      ) : null}

      {noteEditing && canEdit && onNoteSave ? (
        <div className="hl-note-edit" data-od-id={`hl-note-edit-${h.id}`}>
          <label className="hl-note-kicker" htmlFor={noteFieldId}>
            YOUR NOTE
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
              data-od-id={`hl-note-cancel-${h.id}`}
              disabled={savingNote}
              onClick={cancelNote}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn sm"
              data-od-id={`hl-note-save-${h.id}`}
              disabled={savingNote}
              onClick={() => void saveNote()}
            >
              {savingNote ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}

      {tags.length > 0 || tagEditing ? (
        <div
          className="hl-tags"
          data-od-id={`hl-tags-${h.id}`}
          ref={tagsRowRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {tags.map((t) => {
            const active = activeSet.has(tagKey(t));
            const slug = tagKey(t).replace(/[^a-z0-9]+/g, '-');
            if (tagEditing && canEdit && onTagsChange) {
              return (
                <span
                  key={t}
                  className="hl-tag-chip"
                  data-od-id={`hl-tag-chip-${h.id}-${slug}`}
                >
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
                className={`hl-tag${active ? ' active' : ''}`}
                data-od-id={`hl-tag-${h.id}-${slug}`}
                aria-pressed={active}
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

      {tagEditing && canEdit && onTagsChange ? (
        <div className="hl-tag-edit" data-od-id={`hl-tag-edit-${h.id}`}>
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
            data-od-id={`hl-tag-addbtn-${h.id}`}
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
        <p className="hl-tag-error" data-od-id={`hl-tag-error-${h.id}`} role="alert">
          {tagError}
        </p>
      ) : null}

      <div className="hl-actions" data-od-id={`hl-actions-${h.id}`}>
        <button
          type="button"
          className="hl-ico"
          data-od-id={`hl-copy-text-${h.id}`}
          aria-label={copiedText ? 'Copied' : 'Copy'}
          title={copiedText ? 'Copied quote!' : 'Copy'}
          onClick={handleCopyText}
        >
          <HighlightCopyIcon />
        </button>
        {sourceHref ? (
          <button
            type="button"
            className="hl-ico"
            data-od-id={`hl-link-${h.id}`}
            aria-label={copiedLink ? 'Quote link copied' : 'Copy direct link to quote'}
            title={copiedLink ? 'Copied link!' : 'Copy quote link'}
            onClick={handleCopyLink}
          >
            <HighlightLinkIcon />
          </button>
        ) : null}
        {canNote ? (
          <button
            type="button"
            className={`hl-ico${noteEditing ? ' is-active' : ''}`}
            data-od-id={`hl-note-${h.id}`}
            aria-label={hasNote ? 'Edit note' : 'Add note'}
            aria-pressed={noteEditing}
            title={hasNote ? 'Edit note' : 'Add note'}
            onClick={() => {
              if (noteEditing) {
                cancelNote();
              } else {
                startNoteEdit();
                setTagEditing(false);
              }
            }}
          >
            <HighlightNoteIcon />
          </button>
        ) : null}
        {canTag ? (
          <button
            type="button"
            className={`hl-ico${tagEditing ? ' is-active' : ''}`}
            data-od-id={`hl-tag-add-${h.id}`}
            aria-label="Add tags"
            aria-pressed={tagEditing}
            title="Add tags"
            onClick={() => {
              if (tagEditing) {
                setTagEditing(false);
                setTagInput('');
                setTagError(null);
              } else {
                startTagEdit();
                setNoteEditing(false);
              }
            }}
          >
            <HighlightTagIcon />
          </button>
        ) : null}
        {sourceHref ? (
          <a
            className="hl-ico"
            data-od-id={`hl-open-${h.id}`}
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source"
            title="Open source"
            onClick={() => {
              trackEvent('highlight_open_source', { client: clientKind });
            }}
          >
            <HighlightOpenIcon />
          </a>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="hl-ico is-danger"
            data-od-id={`hl-delete-${h.id}`}
            aria-label="Delete highlight"
            title="Delete highlight"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <HighlightDeleteIcon />
          </button>
        ) : null}
      </div>

      {canDelete ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          onClose={() => {
            if (!isDeleting) setDeleteOpen(false);
          }}
          severity={deleteCopy.severity}
          title={deleteCopy.title}
          message={deleteCopy.message}
          note={deleteCopy.note}
          strongNames={deleteCopy.strongNames}
          confirmLabel={deleteCopy.confirmLabel}
          cancelLabel={deleteCopy.cancelLabel}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
          isConfirming={isDeleting}
        />
      ) : null}
    </div>
  );
}
