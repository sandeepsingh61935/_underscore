import { useCallback, useState } from 'react';

import { useActiveLLMProvider } from './useActiveLLMProvider';
import { useLLMStream } from './useLLMStream';

import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { PromptContext } from '@/shared/llm/prompts';
import { buildExcerptSummaryRequest } from '@/shared/llm/summary-request';

type StreamAPI = ReturnType<typeof useLLMStream>;
export type SummarizePhase = 'idle' | 'streaming' | 'done' | 'error';

export function useGenerateSummary(): Omit<StreamAPI, 'start'> & {
  phase: SummarizePhase;
  start: (ctx: PromptContext, excerpts: HighlightExcerpt[]) => void;
} {
  const stream = useLLMStream();
  const { provider } = useActiveLLMProvider();
  const [phase, setPhase] = useState<SummarizePhase>('idle');

  const start = useCallback((ctx: PromptContext, excerpts: HighlightExcerpt[]) => {
    setPhase('streaming');
    stream.start({
      template: 'summarizePage',
      highlights: ctx.highlights,
      request: buildExcerptSummaryRequest(ctx, excerpts),
      provider: provider ?? undefined,
    });
  }, [stream, provider]);

  const derivedPhase: SummarizePhase = stream.status === 'done'
    ? 'done'
    : stream.status === 'error'
      ? 'error'
      : phase;

  return {
    ...stream,
    phase: derivedPhase,
    start,
  };
}
