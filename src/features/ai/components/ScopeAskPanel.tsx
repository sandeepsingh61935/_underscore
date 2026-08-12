import React, { useRef, useState } from 'react';

import { useAskModelSelection } from '@/features/ai/hooks/useAskModelSelection';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { useScopeQuery } from '@/features/ai/hooks/useScopeQuery';
import type { PromptHighlight, ScopeKind } from '@/shared/llm/prompts';
import type { LlmArtifactScope } from '@/shared/schemas/llm-artifact-schema';

export interface ScopeAskPanelProps {
  scopeLabel: string;
  scopeKind: ScopeKind;
  /** Kept for call-site compat; Ask no longer persists scope_query. */
  artifactScope: LlmArtifactScope;
  highlights: PromptHighlight[];
  highlightCount: number;
  disabled?: boolean;
  placeholder?: string;
}

/** Extension scope ask composer (ephemeral stream; no scope_query writes). */
export function ScopeAskPanel({
  scopeLabel,
  scopeKind,
  artifactScope: _artifactScope,
  highlights,
  highlightCount: _highlightCount,
  disabled = false,
  placeholder,
}: ScopeAskPanelProps): React.ReactElement {
  const query = useScopeQuery();
  const modelSelection = useAskModelSelection();
  const provider = modelSelection.activeProvider;
  const { fetch: fetchPageContext } = usePageContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState('');
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const usableHighlights = highlights.filter(h => h.text.trim().length > 0);
  const busy = query.isPreparing || query.status === 'streaming';
  const inputDisabled = disabled || busy;
  const submitDisabled =
    inputDisabled || !question.trim() || usableHighlights.length === 0 || provider === null;
  const answerText = query.chunks;
  const noModelConfigured = provider === null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setContextNote(null);
    setAskError(null);
    const trimmed = question.trim();
    if (!trimmed || provider === null) return;
    try {
      const result = await query.ask({
        question: trimmed,
        scopeLabel,
        scopeKind,
        highlights: usableHighlights,
        fetchPageContext,
        provider,
      });
      if (result?.errorNote) {
        setContextNote(`Page context unavailable: ${result.errorNote}`);
      } else if (result?.cacheNote) {
        setContextNote(result.cacheNote);
      }
    } catch (err) {
      setAskError((err as Error).message);
    }
  };

  if (highlights.length === 0) {
    return <></>;
  }

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        zIndex: 5,
        padding: '8px 16px 10px',
        borderTop: '1px solid var(--rule)',
        background: 'var(--paper)',
        pointerEvents: 'auto',
      }}
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => inputRef.current?.focus()}
            placeholder={placeholder ?? 'Ask about your highlights…'}
            disabled={inputDisabled}
            autoComplete="off"
            aria-label={`Ask about this ${scopeKind}`}
            style={{
              flex: 1,
              minHeight: 36,
              minWidth: 0,
              font: 'var(--sans)',
              fontSize: 'var(--step--1)',
              padding: '6px 8px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              pointerEvents: 'auto',
              cursor: inputDisabled ? 'not-allowed' : 'text',
            }}
          />
          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              font: 'var(--sans)',
              fontSize: 'var(--step--1)',
              padding: '6px 10px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              cursor: submitDisabled ? 'not-allowed' : 'pointer',
              pointerEvents: 'auto',
            }}
          >
            Ask
          </button>
        </div>
        <p className="u-mono" style={{ margin: 0, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          {usableHighlights.length === 0
            ? 'Wait for highlight text to load before asking.'
            : noModelConfigured
              ? 'Set a model in Settings → Models & providers first.'
              : `Grounded to this ${scopeKind} only · ${usableHighlights.length} highlights`}
        </p>
      </form>

      {contextNote && (
        <p className="u-mono" style={{ marginTop: 6, fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
          {contextNote}
        </p>
      )}

      {query.status === 'streaming' && !query.chunks && (
        <p className="u-mono" style={{ marginTop: 6, fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
          Thinking…
        </p>
      )}

      {(query.error || query.prepareError || askError) && (
        <p style={{ marginTop: 6, fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
          Failed: {query.error ?? query.prepareError ?? askError}
        </p>
      )}

      {answerText && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 8,
            padding: 8,
            whiteSpace: 'pre-wrap',
            font: 'var(--sans)',
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {answerText}
        </div>
      )}
    </div>
  );
}
