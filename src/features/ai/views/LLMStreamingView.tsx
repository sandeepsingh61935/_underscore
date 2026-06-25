import React, { useEffect } from 'react';

import { useGenerateSummary } from '../hooks/useGenerateSummary';

import type { PromptContext } from '@/shared/llm/prompts';

interface LLMStreamingViewProps {
  ctx: PromptContext;
  onClose: () => void;
}

export function LLMStreamingView({ ctx, onClose }: LLMStreamingViewProps): React.ReactElement {
  const { chunks, status, error, start, abort } = useGenerateSummary();

  useEffect(() => { start(ctx); return () => abort(); }, [ctx, start, abort]);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
        padding: 'var(--step-2)', gap: 'var(--step-1)',
      }}
    >
      <h2 className="u-serif" style={{ margin: 0 }}>Summary</h2>
      <div
        role="status"
        aria-live="polite"
        style={{
          flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap',
          font: 'var(--sans)', color: 'var(--ink)', background: 'var(--paper)',
          padding: 'var(--step-2)', border: '1px solid var(--rule)',
        }}
      >
        {chunks || (status === 'streaming' ? '…' : '')}
      </div>
      {error && <div style={{ color: 'var(--ink)', font: 'var(--sans)' }}>Error: {error}</div>}
      <div style={{ display: 'flex', gap: 'var(--step-1)' }}>
        <button type="button" onClick={abort} disabled={status !== 'streaming'}>Stop</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}