/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (MarginaliaStrip section)
 * Spec: docs/superpowers/specs/2026-07-14-marginalia-inline-notes-tags-design.md
 * Tile density: docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 *
 * Accordion strip with four design states: `empty` / `collapsed` /
 * `expanded` / `saving`. Notes and tags share one bordered tray on a
 * single band (Notes flex | Tags hug); tags wrap under notes when crowded.
 * Done/Saving sit top-right of the tray (no NOTE header row).
 *
 * When `embedInCard` is true, the strip has no outer margin/indent and is
 * meant for HighlightCard's unified action row (notes · tags · Edit · Delete).
 *
 * Dirty-guard: re-sync from props when highlightId changes, or when collapsed
 * and idle (not saving / not focused). While expanded, keep local draft so a
 * slow library refresh cannot wipe tags the user just added.
 * Persist only the fields being edited (notes-only vs tags-only).
 * Note saves debounce 500ms and flush on blur/Done. Inputs are NEVER
 * disabled while `isSaving` — only the chrome text swaps to "Saving…".
 * The `disabled` prop is a separate permission gate.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { LabelInputRow } from '@/ui-system/components/composed/LabelInputRow';
import { TagPill } from '@/ui-system/components/primitives/TagPill';

/**
 * Design states from the canvas/spec. `saving` is documented for API
 * completeness — internally we stay in the `expanded` visual layout and
 * swap the top-right chrome text based on `isSaving`.
 */
export type MarginaliaState = 'empty' | 'collapsed' | 'expanded' | 'saving';

export interface MarginaliaStripProps {
  highlightId: string;
  notes?: string;
  labels?: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled?: boolean;
  suggestions?: string[];
  /**
   * Embed into HighlightCard action row: no strip margin/indent, compact invite,
   * hide secondary "Edit" label (tile owns Edit for quote body).
   */
  embedInCard?: boolean;
}

const NOTE_SAVE_DEBOUNCE_MS = 500;

/** Horizontal margin: 16px right + 24px left indent (standalone band). */
const STRIP_MARGIN = '0 16px 8px 24px';
const STRIP_WIDTH = 'calc(100% - 40px)';
const EMBED_MARGIN = '0';
const EMBED_WIDTH = '100%';

function autoGrowNoteField(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 18)}px`;
}

/** Collapsed strip shows at most this many tag pills; overflow is "+N". */
const COLLAPSED_TAG_VISIBLE = 2;

function SharedTray({
  children,
  chrome,
  empty,
}: {
  children: React.ReactNode;
  chrome?: React.ReactNode;
  /** Both notes and tags empty — soft dashed band so two slots still read. */
  empty?: boolean;
}): React.ReactElement {
  return (
    <div
      data-testid="marginalia-tray"
      data-empty={empty ? 'true' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 8,
        padding: '6px 8px',
        paddingRight: chrome ? 48 : 8,
        border: empty ? '1px dashed var(--rule-soft)' : '1px solid var(--rule-soft)',
        borderRadius: 'var(--radius)',
        background: empty ? 'var(--paper-2)' : 'var(--paper)',
        minHeight: 28,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {children}
      {chrome != null && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
          }}
        >
          {chrome}
        </div>
      )}
    </div>
  );
}

export function MarginaliaStrip({
  highlightId,
  notes,
  labels,
  isExpanded,
  onToggleExpand,
  disabled = false,
  suggestions = [],
  embedInCard = false,
}: MarginaliaStripProps): React.ReactElement {
  const { updateMetadata } = useUpdateHighlightMetadata();
  const shellWidth = embedInCard ? EMBED_WIDTH : STRIP_WIDTH;
  const shellMargin = embedInCard ? EMBED_MARGIN : STRIP_MARGIN;

  const [noteDraft, setNoteDraft] = useState(notes ?? '');
  const [labelsDraft, setLabelsDraft] = useState<string[]>(labels ?? []);
  const [tagInputDraft, setTagInputDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteDraftRef = useRef(noteDraft);
  const labelsDraftRef = useRef(labelsDraft);
  const noteFieldRef = useRef<HTMLTextAreaElement | null>(null);
  noteDraftRef.current = noteDraft;
  labelsDraftRef.current = labelsDraft;

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  /** Persist only the fields in the patch (do not always send both notes + tags). */
  const persist = useCallback(
    async (patch: { notes?: string; tags?: string[] }): Promise<boolean> => {
      if (patch.notes === undefined && patch.tags === undefined) return true;
      setIsSaving(true);
      try {
        return await updateMetadata(highlightId, patch, { silent: true });
      } finally {
        setIsSaving(false);
      }
    },
    [highlightId, updateMetadata]
  );

  const prevHighlightIdRef = useRef(highlightId);
  useEffect(() => {
    const highlightChanged = prevHighlightIdRef.current !== highlightId;
    prevHighlightIdRef.current = highlightId;

    if (highlightChanged) {
      setNoteDraft(notes ?? '');
      setLabelsDraft(labels ?? []);
      return;
    }

    // While expanded or saving, keep optimistic local state (avoids wipe on refresh).
    if (isExpanded || isSaving || isNoteFocused) return;

    setNoteDraft(notes ?? '');
    setLabelsDraft(labels ?? []);
  }, [notes, labels, highlightId, isExpanded, isSaving, isNoteFocused]);

  useEffect(() => {
    return () => {
      clearSaveTimer();
    };
  }, [clearSaveTimer]);

  useLayoutEffect(() => {
    if (isExpanded) {
      autoGrowNoteField(noteFieldRef.current);
    }
  }, [isExpanded, noteDraft]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteDraft(value);
      clearSaveTimer();
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persist({ notes: value });
      }, NOTE_SAVE_DEBOUNCE_MS);
    },
    [clearSaveTimer, persist]
  );

  const flushNoteSave = useCallback(async (): Promise<void> => {
    if (saveTimerRef.current !== null) {
      clearSaveTimer();
      await persist({ notes: noteDraftRef.current });
    }
  }, [clearSaveTimer, persist]);

  const handleNoteBlur = useCallback(() => {
    setIsNoteFocused(false);
    void flushNoteSave();
  }, [flushNoteSave]);

  const handleDone = useCallback(() => {
    void (async () => {
      await flushNoteSave();
      onToggleExpand();
    })();
  }, [flushNoteSave, onToggleExpand]);

  const handleAddLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || labelsDraft.includes(trimmed)) return;
      const next = [...labelsDraft, trimmed];
      setLabelsDraft(next);
      labelsDraftRef.current = next;
      setTagInputDraft('');
      void persist({ tags: next });
    },
    [labelsDraft, persist]
  );

  const handleRemoveLabel = useCallback(
    (index: number) => {
      const next = labelsDraft.filter((_, i) => i !== index);
      setLabelsDraft(next);
      labelsDraftRef.current = next;
      void persist({ tags: next });
    },
    [labelsDraft, persist]
  );

  const hasContent = noteDraft.trim() !== '' || labelsDraft.length > 0;

  if (!isExpanded && !hasContent) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        disabled={disabled}
        aria-label="+ Add note or tags"
        style={{
          display: embedInCard ? 'inline-flex' : 'block',
          width: embedInCard ? 'auto' : shellWidth,
          maxWidth: '100%',
          margin: shellMargin,
          padding: embedInCard ? '3px 7px' : '7px 10px',
          textAlign: 'left',
          border: '1px dashed var(--rule-soft)',
          background: 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
          }}
        >
          + Add note or tags
        </span>
      </button>
    );
  }

  if (!isExpanded && hasContent) {
    const visibleTags = labelsDraft.slice(0, COLLAPSED_TAG_VISIBLE);
    const tagOverflow = Math.max(0, labelsDraft.length - COLLAPSED_TAG_VISIBLE);
    const collapsedBody = (
      <>
        {noteDraft.trim() !== '' && (
          <span
            data-testid="marginalia-note-snip"
            style={{
              flex: embedInCard ? '0 1 auto' : '1 1 120px',
              minWidth: 0,
              maxWidth: embedInCard ? 140 : undefined,
              fontFamily: 'var(--sans)',
              fontSize: 11,
              lineHeight: 1.4,
              fontStyle: 'italic',
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginRight: labelsDraft.length > 0 ? 2 : 0,
            }}
          >
            {noteDraft}
          </span>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: embedInCard ? 'nowrap' : 'wrap',
            alignItems: 'center',
            gap: 6,
            flex: '0 1 auto',
            maxWidth: '100%',
            overflow: embedInCard ? 'hidden' : undefined,
            paddingLeft:
              embedInCard && noteDraft.trim() !== '' && labelsDraft.length > 0 ? 2 : 0,
          }}
        >
          {visibleTags.map((label, index) => (
            <TagPill key={`${label}-${index}`} label={label} readonly />
          ))}
          {tagOverflow > 0 && (
            <span
              data-testid="marginalia-tag-overflow"
              className="u-mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 20,
                padding: '0 4px',
                fontSize: 10,
                color: 'var(--ink-4)',
                flexShrink: 0,
              }}
            >
              +{tagOverflow}
            </span>
          )}
          {!embedInCard && (
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--mono)',
                fontSize: 'var(--step--2)',
                color: 'var(--ink-3)',
              }}
            >
              Edit
            </span>
          )}
        </div>
      </>
    );

    if (embedInCard) {
      return (
        <button
          type="button"
          onClick={onToggleExpand}
          disabled={disabled}
          aria-label="Edit note and tags"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            margin: 0,
            padding: '2px 0',
            border: 'none',
            background: 'transparent',
            cursor: disabled ? 'default' : 'pointer',
            boxSizing: 'border-box',
            textAlign: 'left',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {collapsedBody}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onToggleExpand}
        disabled={disabled}
        style={{
          display: 'block',
          width: shellWidth,
          margin: shellMargin,
          padding: '8px 10px',
          textAlign: 'left',
          border: 'none',
          borderLeft: '2px solid var(--accent)',
          background: 'var(--paper-2)',
          cursor: disabled ? 'default' : 'pointer',
          boxSizing: 'border-box',
        }}
      >
        <SharedTray>{collapsedBody}</SharedTray>
      </button>
    );
  }

  const chrome = isSaving ? (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 'var(--step--2)',
        color: 'var(--ink-3)',
      }}
    >
      Saving…
    </span>
  ) : (
    <button
      type="button"
      onClick={handleDone}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'var(--mono)',
        fontSize: 'var(--step--2)',
        color: 'var(--ink-3)',
      }}
    >
      Done
    </button>
  );

  const trayEmpty = noteDraft.trim() === '' && labelsDraft.length === 0;

  const editor = (
    <SharedTray chrome={chrome} empty={trayEmpty}>
      <textarea
        ref={noteFieldRef}
        value={noteDraft}
        onChange={(event) => {
          handleNoteChange(event.target.value);
          autoGrowNoteField(event.target);
        }}
        onFocus={() => setIsNoteFocused(true)}
        onBlur={handleNoteBlur}
        disabled={disabled}
        rows={1}
        placeholder="What stood out?"
        aria-label="Highlight note"
        style={{
          flex: '1 1 120px',
          minWidth: embedInCard ? 72 : 100,
          boxSizing: 'border-box',
          resize: 'none',
          overflow: 'hidden',
          fontFamily: 'var(--sans)',
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--ink)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
        }}
      />
      <div
        style={{
          flex: '0 1 auto',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <LabelInputRow
          labels={labelsDraft}
          onRemoveLabel={handleRemoveLabel}
          onAddLabel={handleAddLabel}
          draft={tagInputDraft}
          onDraftChange={setTagInputDraft}
          suggestions={suggestions}
          disabled={disabled}
          variant="embedded"
        />
      </div>
    </SharedTray>
  );

  if (embedInCard) {
    return (
      <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>{editor}</div>
    );
  }

  return (
    <div
      style={{
        width: shellWidth,
        margin: shellMargin,
        padding: '8px 10px 8px 12px',
        borderLeft: '2px solid var(--accent)',
        background: 'var(--paper-2)',
        boxSizing: 'border-box',
      }}
    >
      {editor}
    </div>
  );
}
