import React, { useEffect, useId, useState } from 'react';

import { phoneHighlightHref } from './phoneHighlightHref';

import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { deleteHighlightCopy } from '@/shared/utils/confirm-dialog-copy';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import type { WebClientKind } from '@/web/lib/classify-web-client';


const QUOTE_CLAMP = 140;

function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

export function PhoneHighlightCard({
  highlight,
  meta,
  onOpen,
  clientKind = 'phone',
  onNoteSave,
  onTagsChange,
  onDelete,
  selecting = false,
  selected = false,
}: {
  highlight: WebHighlight;
  meta: string;
  onOpen: () => void;
  clientKind?: WebClientKind;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  selecting?: boolean;
  selected?: boolean;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(highlight.note);
  const [savingNote, setSavingNote] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(() => normalizeHighlightTags(highlight.tags));
  const [tagError, setTagError] = useState<string | null>(null);
  const [savingTags, setSavingTags] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const noteId = useId();
  const tagId = useId();
  const href = phoneHighlightHref(highlight);
  const long = highlight.quote.length > QUOTE_CLAMP;
  const note = (noteEditing ? noteDraft : highlight.note ?? '').trim();
  const deleteCopy = deleteHighlightCopy();

  useEffect(() => {
    if (!noteEditing) setNoteDraft(highlight.note);
  }, [highlight.id, highlight.note, noteEditing]);

  useEffect(() => {
    if (tagEditing) return;
    setTags(normalizeHighlightTags(highlight.tags));
  }, [highlight.id, highlight.tags, tagEditing]);

  async function saveNote(): Promise<void> {
    if (!onNoteSave) return;
    setSavingNote(true);
    const ok = await onNoteSave(highlight.id, noteDraft.trim());
    setSavingNote(false);
    if (ok) setNoteEditing(false);
  }

  async function addTag(): Promise<void> {
    if (!onTagsChange) return;
    const clean = normalizeTagInput(tagInput);
    if (!clean) {
      setTagError('Type a tag name first.');
      return;
    }
    const next = normalizeHighlightTags([...tags, clean]);
    if (next.length === tags.length) {
      setTagInput('');
      setTagError(tags.some((t) => tagKey(t) === tagKey(clean)) ? null : 'Tag limit reached (10).');
      return;
    }
    setSavingTags(true);
    setTagError(null);
    const ok = await onTagsChange(highlight.id, next);
    setSavingTags(false);
    if (!ok) {
      setTagError('Could not save tag. Try again.');
      return;
    }
    setTags(next);
    setTagInput('');
  }

  return (
    <article
      className={selected ? 'phone-hl is-selected' : 'phone-hl'}
      data-od-id={`phone-hl-${highlight.id}`}
    >
      {selecting ? (
        <span className="phone-page-check" aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      ) : null}
      <button type="button" className="phone-hl-body" onClick={onOpen}>
        <p className={expanded ? 'phone-hl-quote is-open' : 'phone-hl-quote'}>{highlight.quote}</p>
      </button>
      {long ? (
        <button
          type="button"
          className="phone-more"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
      {meta ? <p className="phone-hl-meta">{meta}</p> : null}

      {note && !noteEditing ? (
        <div
          className="phone-note"
          role="button"
          tabIndex={0}
          onClick={() => {
            setNoteDraft(highlight.note);
            setNoteEditing(true);
            setTagEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setNoteDraft(highlight.note);
              setNoteEditing(true);
              setTagEditing(false);
            }
          }}
        >
          <span className="phone-note-kicker">Note</span>
          {note}
        </div>
      ) : null}
      {noteEditing ? (
        <div className="phone-note-edit">
          <label className="phone-note-kicker" htmlFor={noteId}>
            Note
          </label>
          <textarea
            id={noteId}
            className="phone-note-input"
            rows={3}
            value={noteDraft}
            aria-label="Note"
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="phone-note-actions">
            <button type="button" className="btn sm ghost" onClick={() => setNoteEditing(false)}>
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

      {tags.length > 0 || tagEditing ? (
        <div className="phone-tags">
          {tags.map((tag) => (
            <span key={tag} className="phone-tag">
              {tag}
              {tagEditing && onTagsChange ? (
                <button
                  type="button"
                  className="phone-tag-rm"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => {
                    const next = tags.filter((t) => tagKey(t) !== tagKey(tag));
                    setTags(next);
                    void onTagsChange(highlight.id, next);
                  }}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {tagEditing ? (
        <div className="phone-tag-edit">
          <input
            id={tagId}
            className="phone-tag-input"
            value={tagInput}
            placeholder="Add tag…"
            aria-label="New tag name"
            onChange={(e) => {
              setTagInput(e.target.value);
              if (tagError) setTagError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTag();
              }
            }}
          />
          <button type="button" className="btn sm" disabled={savingTags} onClick={() => void addTag()}>
            {savingTags ? 'Saving…' : 'Add'}
          </button>
        </div>
      ) : null}
      {tagError ? (
        <p className="phone-tag-error" role="alert">
          {tagError}
        </p>
      ) : null}

      <div className="phone-hl-actions">
        <button
          type="button"
          className="phone-ico"
          aria-label={copied ? 'Copied' : 'Copy'}
          onClick={() => {
            const text = highlight.quote;
            if (!navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="1.5" />
            <path d="M6 15H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 3h9A1.5 1.5 0 0 1 15.5 4.5V6" />
          </svg>
        </button>
        {href ? (
          <button
            type="button"
            className="phone-ico"
            aria-label={copiedLink ? 'Quote link copied' : 'Copy quote link'}
            onClick={() => {
              if (!navigator.clipboard?.writeText || !href) return;
              void navigator.clipboard.writeText(href).then(() => {
                setCopiedLink(true);
                window.setTimeout(() => setCopiedLink(false), 1500);
              });
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          className={noteEditing ? 'phone-ico is-active' : 'phone-ico'}
          aria-label={note ? 'Edit note' : 'Add note'}
          aria-pressed={noteEditing}
          onClick={() => {
            setNoteDraft(highlight.note);
            setNoteEditing((open) => !open);
            setTagEditing(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h9l3 3v13H6z" />
            <path d="M14 4v4h4M8 12h8M8 16h6" />
          </svg>
        </button>
        <button
          type="button"
          className={tagEditing ? 'phone-ico is-active' : 'phone-ico'}
          aria-label="Add tags"
          aria-pressed={tagEditing}
          onClick={() => {
            setTagEditing((open) => !open);
            setNoteEditing(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12 12 4h6v6l-8 8-6-6z" />
            <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>
        {href ? (
          <a
            className="phone-ico"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source"
            onClick={() => trackEvent('highlight_open_source', { client: clientKind })}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        ) : null}
        <button
          type="button"
          className="phone-ico is-danger"
          aria-label="Delete highlight"
          onClick={() => setDeleteOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M7 7l1 12h8l1-12" />
          </svg>
        </button>
      </div>

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
          isConfirming={isDeleting}
          onConfirm={() => {
            if (!onDelete) {
              setDeleteOpen(false);
              return;
            }
            setIsDeleting(true);
            void onDelete(highlight.id).finally(() => {
              setIsDeleting(false);
              setDeleteOpen(false);
            });
          }}
        />
    </article>
  );
}
