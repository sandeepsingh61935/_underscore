import React, { useRef, useState } from 'react';

import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useLlmArtifacts } from '@/features/ai/hooks/useLlmArtifacts';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { usePersistLlmArtifactOnDone } from '@/features/ai/hooks/usePersistLlmArtifactOnDone';
import { useScopeQuery } from '@/features/ai/hooks/useScopeQuery';
import type { PromptHighlight, ScopeKind } from '@/shared/llm/prompts';
import type { LlmArtifactScope } from '@/shared/schemas/llm-artifact-schema';

export interface ScopeAskPanelProps {
  scopeLabel: string;
  scopeKind: ScopeKind;
  artifactScope: LlmArtifactScope;
  highlights: PromptHighlight[];
  highlightCount: number;
  disabled?: boolean;
  placeholder?: string;
}

export function ScopeAskPanel({
  scopeLabel,
  scopeKind,
  artifactScope,
  highlights,
  highlightCount,
  disabled = false,
  placeholder,
}: ScopeAskPanelProps): React.ReactElement {
  const query = useScopeQuery();
  const { provider } = useActiveLLMProvider();
  const artifacts = useLlmArtifacts(artifactScope);
  const { fetch: fetchPageContext } = usePageContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const usableHighlights = highlights.filter(h => h.text.trim().length > 0);
  const busy = query.isPreparing || query.status === 'streaming';
  const inputDisabled = disabled || busy;
  const submitDisabled = inputDisabled || !question.trim() || usableHighlights.length === 0;
  const savedQueries = artifacts.getQueries();
  const answerText = query.chunks;

  usePersistLlmArtifactOnDone({
    status: query.status,
    content: query.chunks,
    input: query.status === 'done' && query.chunks.trim() && lastQuestion
      ? {
          kind: 'scope_query',
          scope: artifactScope,
          content: query.chunks,
          question: lastQuestion,
          highlightCountAtGeneration: highlightCount,
          provider: provider ?? undefined,
        }
      : null,
    save: artifacts.save,
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setContextNote(null);
    setAskError(null);
    const trimmed = question.trim();
    if (!trimmed) return;
    setLastQuestion(trimmed);
    try {
      const result = await query.ask({
        question: trimmed,
        scopeLabel,
        scopeKind,
        highlights: usableHighlights,
        fetchPageContext,
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
      {savedQueries.length > 0 && (
        <div style={{ marginBottom: 8, maxHeight: 120, overflowY: 'auto' }}>
          {savedQueries.map((qa) => (
            <div key={qa.id} style={{ marginBottom: 8, fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
              {qa.question && (
                <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 2 }}>
                  Q: {qa.question}
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{qa.content}</div>
            </div>
          ))}
        </div>
      )}

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
            ? 'Unlock the vault or wait for highlight text to load before asking.'
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
