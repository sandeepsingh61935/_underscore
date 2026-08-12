/**
 * @file WebHighlightCard.tsx
 * @description OD-parity highlight card for the web app: quote/meta main region
 * plus foot with inline tags and notes (edit when signed-in).
 * Persist via parent callbacks (useUpdateHighlightMetadata / library patch).
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { WebHighlight } from '@/web/hooks/useWebLibrary';

export type WebHighlightCardProps = {
  highlight: WebHighlight;
  /** Show domain in meta (Library section views often hide it). */
  showDomain?: boolean;
  /** When false, omit path/time meta (OD library page list). */
  showMeta?: boolean;
  matchBadge?: string | null;
  /** Guests / locked: display only, no edit affordances. */
  readOnly?: boolean;
  /** Active tag filters (lowercased compare) for chip active state. */
  activeTagFilters?: string[];
  onOpenPage?: (domain: string, path: string) => void;
  /** Toggle a tag into the Library filter set. */
  onToggleTagFilter?: (tag: string) => void;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
};

function relativeTime(ts: number, now = Date.now()): string {
  const d = now - ts;
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}m ago`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}h ago`;
  return `${Math.round(d / 86400e3)}d ago`;
}

function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

function PencilIco(): React.ReactElement {
  return (
    <svg className="ico" width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
    <svg className="hl-tag-add-ico" width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function WebHighlightCard({
  highlight: h,
  showDomain = true,
  showMeta = true,
  matchBadge,
  readOnly = false,
  activeTagFilters = [],
  onOpenPage,
  onToggleTagFilter,
  onNoteSave,
  onTagsChange,
}: WebHighlightCardProps): React.ReactElement {
  const [noteEditing, setNoteEditing] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(h.note);
  const [tagInput, setTagInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagsRowRef = useRef<HTMLDivElement>(null);
  const noteFieldId = useId();
  const tagFieldId = useId();

  const activeSet = new Set(activeTagFilters.map(tagKey));
  const canEdit = !readOnly && Boolean(onNoteSave || onTagsChange);

  // Sync drafts when highlight id or server values change while not editing.
  useEffect(() => {
    if (!noteEditing) setNoteDraft(h.note);
  }, [h.id, h.note, noteEditing]);

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

  // Click outside tag editor closes it (OD parity).
  useEffect(() => {
    if (!tagEditing) return undefined;
    const onDoc = (e: MouseEvent): void => {
      const el = tagsRowRef.current;
      if (el && !el.contains(e.target as Node)) {
        setTagEditing(false);
        setTagInput('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [tagEditing]);

  const openPage = useCallback(() => {
    onOpenPage?.(h.domain, h.path || '/');
  }, [h.domain, h.path, onOpenPage]);

  const saveNote = useCallback(async () => {
    if (!onNoteSave) return;
    const next = noteDraft.trim();
    setSavingNote(true);
    try {
      const ok = await onNoteSave(h.id, next);
      if (ok) setNoteEditing(false);
    } finally {
      setSavingNote(false);
    }
  }, [h.id, noteDraft, onNoteSave]);

  const cancelNote = useCallback(() => {
    setNoteDraft(h.note);
    setNoteEditing(false);
  }, [h.note]);

  const addTag = useCallback(async () => {
    if (!onTagsChange) return;
    const clean = normalizeTagInput(tagInput);
    if (!clean) {
      tagInputRef.current?.focus();
      return;
    }
    if (h.tags.some((t) => tagKey(t) === tagKey(clean))) {
      setTagInput('');
      return;
    }
    const next = [...h.tags, clean];
    setSavingTags(true);
    try {
      const ok = await onTagsChange(h.id, next);
      if (ok) setTagInput('');
    } finally {
      setSavingTags(false);
    }
  }, [h.id, h.tags, onTagsChange, tagInput]);

  const removeTag = useCallback(
    async (tag: string) => {
      if (!onTagsChange) return;
      const next = h.tags.filter((t) => tagKey(t) !== tagKey(tag));
      setSavingTags(true);
      try {
        await onTagsChange(h.id, next);
      } finally {
        setSavingTags(false);
      }
    },
    [h.id, h.tags, onTagsChange],
  );

  const note = h.note.trim();
  const tags = h.tags;

  return (
    <div className="hl" data-od-id={`hl-${h.id}`}>
      <button
        type="button"
        className="hl-main"
        data-od-id={`hl-main-${h.id}`}
        onClick={openPage}
      >
        <p className="hl-quote">“{h.quote}”</p>
        {showMeta ? (
          <div className="hl-meta">
            {showDomain ? <span className="src">{h.domain}</span> : null}
            <span>{h.path}</span>
            <span>{relativeTime(h.savedAt)}</span>
          </div>
        ) : null}
        {matchBadge ? <div className="match-badge">{matchBadge}</div> : null}
      </button>

      <div className="hl-foot">
        <div className="hl-tags" data-od-id={`hl-tags-${h.id}`} ref={tagsRowRef}>
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
                    onClick={() => void removeTag(t)}
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
                onClick={() => onToggleTagFilter?.(t)}
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
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addTag();
                  }
                  if (e.key === 'Escape') {
                    setTagEditing(false);
                    setTagInput('');
                  }
                }}
              />
              <button
                type="button"
                className="btn sm"
                data-od-id={`hl-tag-addbtn-${h.id}`}
                disabled={savingTags}
                onClick={() => void addTag()}
              >
                Add
              </button>
            </span>
          ) : canEdit && onTagsChange ? (
            <button
              type="button"
              className="hl-tag-add"
              data-od-id={`hl-tag-add-${h.id}`}
              aria-label="Add tag"
              onClick={() => setTagEditing(true)}
            >
              <PlusIco />
            </button>
          ) : null}
        </div>

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
        ) : canEdit && onNoteSave ? (
          <button
            type="button"
            className={`hl-note-btn ${note ? 'has-note' : 'is-empty'}`}
            data-action="edit-note"
            data-od-id={`hl-note-${h.id}`}
            onClick={() => {
              setNoteDraft(h.note);
              setNoteEditing(true);
            }}
          >
            <PencilIco />
            <span className="txt">{note || 'Add note'}</span>
          </button>
        ) : note ? (
          <div className="hl-note-btn has-note" data-od-id={`hl-note-${h.id}`}>
            <PencilIco />
            <span className="txt">{note}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
