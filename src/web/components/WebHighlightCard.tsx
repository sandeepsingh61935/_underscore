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
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

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
};

function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

function PencilIco(): React.ReactElement {
  return (
    <svg
      className="ico"
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 1.6 10.4 3.5 4 9.9 1.8 10.4l.5-2.2L8.5 1.6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIco(): React.ReactElement {
  return (
    <svg
      className="hl-tag-add-ico"
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1v8M1 5h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GhostAction({
  odId,
  kind,
  onClick,
}: {
  odId: string;
  kind: 'tag' | 'note';
  onClick: (e: React.MouseEvent) => void;
}): React.ReactElement {
  const isTag = kind === 'tag';
  return (
    <button
      type="button"
      className={`hl-ghost hl-ghost--${kind}`}
      data-od-id={odId}
      aria-label={isTag ? 'Add tag' : 'Add note'}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={onClick}
    >
      {isTag ? (
        <span className="hl-ghost-mark" aria-hidden="true">
          #
        </span>
      ) : (
        <PencilIco />
      )}
      <span>{isTag ? 'Add tag' : 'Add note'}</span>
    </button>
  );
}

function TrashIco(): React.ReactElement {
  return (
    <svg
      className="ico"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
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
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagsRowRef = useRef<HTMLDivElement>(null);
  const isDeletingRef = useRef(false);
  const noteFieldId = useId();
  const tagFieldId = useId();
  const tagsBusyRef = useRef(false);

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
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canEdit || !onTagsChange) return;
      setTagError(null);
      setTagEditing(true);
    },
    [canEdit, onTagsChange]
  );

  const startNoteEdit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
  const sourceHref = !isRail && h.path ? pageHrefForLibrary(h.domain, h.path) : null;
  // Rail: existing tags/note only. Library empty: Tag/Note on the meta row.
  const hasTags = tags.length > 0;
  const hasNote = Boolean(note);
  const canTag = Boolean(canEdit && onTagsChange && !isRail);
  const canNote = Boolean(canEdit && onNoteSave && !isRail);
  const annotating = tagEditing || noteEditing;
  const isEmptyAnnot = !hasTags && !hasNote && !annotating;
  const showMetaInvites = Boolean((canTag || canNote) && isEmptyAnnot);
  const showTagAdd = Boolean(canTag && (hasTags || tagEditing));
  const showTagGhost = Boolean(canTag && !hasTags && !tagEditing && hasNote);
  const showNoteGhost = Boolean(
    canNote && !hasNote && !noteEditing && (hasTags || tagEditing)
  );
  const showTagsRow = Boolean(
    hasTags ||
    tagEditing ||
    showTagAdd ||
    showTagGhost ||
    showNoteGhost ||
    (hasNote && !noteEditing)
  );
  const showNoteBlock = Boolean(
    (noteEditing && canNote) || (canEdit && onNoteSave && hasNote) || hasNote
  );
  const showFoot = showTagsRow || Boolean(tagError) || showNoteBlock;

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
          {showMeta || showMetaInvites ? (
            <div className="hl-meta">
              {showMeta ? (
                <>
                  {showDomain ? <span className="src">{h.domain}</span> : null}
                  {!isRail && h.path ? (
                    sourceHref ? (
                      <a
                        className="hl-path hl-path-link"
                        href={sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={h.path}
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
                </>
              ) : null}
              {showMetaInvites ? (
                <span className="hl-meta-invites">
                  {canTag ? (
                    <GhostAction
                      odId={`hl-tag-add-${h.id}`}
                      kind="tag"
                      onClick={startTagEdit}
                    />
                  ) : null}
                  {canNote ? (
                    <GhostAction
                      odId={`hl-note-${h.id}`}
                      kind="note"
                      onClick={startNoteEdit}
                    />
                  ) : null}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {canDelete ? (
          <button
            type="button"
            className="hl-delete sr-icon is-delete"
            data-od-id={`hl-delete-${h.id}`}
            aria-label="Delete highlight"
            title="Delete highlight"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <TrashIco />
          </button>
        ) : null}
      </div>

      {showFoot ? (
        <div className="hl-foot">
          {showTagsRow ? (
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
              {tagEditing && canEdit && onTagsChange ? (
                <span className="hl-tag-edit" data-od-id={`hl-tag-edit-${h.id}`}>
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
                      // Keep focus path stable; don't let document handlers steal the click.
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
                </span>
              ) : showTagAdd ? (
                <button
                  type="button"
                  className="hl-tag-add"
                  data-od-id={`hl-tag-add-${h.id}`}
                  aria-label="Add tag"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={startTagEdit}
                >
                  <PlusIco />
                </button>
              ) : showTagGhost ? (
                <GhostAction
                  odId={`hl-tag-add-${h.id}`}
                  kind="tag"
                  onClick={startTagEdit}
                />
              ) : null}
              {showNoteGhost ? (
                <GhostAction
                  odId={`hl-note-${h.id}`}
                  kind="note"
                  onClick={startNoteEdit}
                />
              ) : !noteEditing && hasNote && canEdit && onNoteSave ? (
                <button
                  type="button"
                  className="hl-note-btn has-note"
                  data-action="edit-note"
                  data-od-id={`hl-note-${h.id}`}
                  onClick={startNoteEdit}
                >
                  <PencilIco />
                  <span className="txt">{note}</span>
                </button>
              ) : !noteEditing && hasNote ? (
                <div className="hl-note-btn has-note" data-od-id={`hl-note-${h.id}`}>
                  <PencilIco />
                  <span className="txt">{note}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {tagError ? (
            <p className="hl-tag-error" data-od-id={`hl-tag-error-${h.id}`} role="alert">
              {tagError}
            </p>
          ) : null}

          {noteEditing && canEdit && onNoteSave ? (
            <div className="hl-note-edit" data-od-id={`hl-note-edit-${h.id}`}>
              <textarea
                id={noteFieldId}
                ref={noteRef}
                className="hl-note-input"
                rows={2}
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
        </div>
      ) : null}

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
