/**
 * Inline note and tag editor for a highlight card (section drill-down).
 */

import React, { useCallback, useEffect, useState } from 'react';

import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { Chip } from '@/ui-system/components/primitives/Chip';

export interface HighlightMetadataEditorProps {
  highlightId: string;
  notes?: string;
  tags?: string[];
  disabled?: boolean;
}

export function HighlightMetadataEditor({
  highlightId,
  notes: initialNotes = '',
  tags: initialTags = [],
  disabled = false,
}: HighlightMetadataEditorProps): React.ReactElement {
  const { updateMetadata } = useUpdateHighlightMetadata();
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagDraft, setTagDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setTags(initialTags);
  }, [highlightId, initialNotes, initialTags]);

  const persist = useCallback(async (nextNotes: string, nextTags: string[]) => {
    setIsSaving(true);
    try {
      await updateMetadata(highlightId, { notes: nextNotes, tags: nextTags });
    } finally {
      setIsSaving(false);
    }
  }, [highlightId, updateMetadata]);

  const addTag = useCallback(() => {
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    const next = [...tags, trimmed];
    setTags(next);
    setTagDraft('');
    void persist(notes, next);
  }, [notes, persist, tagDraft, tags]);

  const removeTag = useCallback((index: number) => {
    const next = tags.filter((_, i) => i !== index);
    setTags(next);
    void persist(notes, next);
  }, [notes, persist, tags]);

  const handleNotesBlur = useCallback(() => {
    if (notes === initialNotes) return;
    void persist(notes, tags);
  }, [initialNotes, notes, persist, tags]);

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => { void handleNotesBlur(); }}
        disabled={disabled || isSaving}
        placeholder="Add a note…"
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          font: 'var(--sans)',
          fontSize: 'var(--step--1)',
          color: 'var(--ink)',
          background: 'var(--paper)',
          border: '1px solid var(--rule-soft)',
          padding: '6px 8px',
          lineHeight: 1.4,
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {tags.map((tag, index) => (
          <Chip
            key={`${tag}-${index}`}
            variant="input"
            onRemove={() => removeTag(index)}
            disabled={disabled || isSaving}
            style={{ fontSize: 'var(--step--1)', minHeight: 32 }}
          >
            {tag}
          </Chip>
        ))}
        <input
          type="text"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={() => { addTag(); }}
          disabled={disabled || isSaving}
          placeholder="Add tag…"
          aria-label="Add tag"
          style={{
            flex: '1 1 80px',
            minWidth: 80,
            font: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--rule-soft)',
            padding: '4px 2px',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
