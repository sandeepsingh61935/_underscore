import { useCallback, useState } from 'react';

import { useActiveLLMProvider } from './useActiveLLMProvider';
import { useLLMStream } from './useLLMStream';

import type { PromptHighlight, ScopeKind } from '@/shared/llm/prompts';
import { prepareHighlightExcerpts, type FetchPageContextFn } from '@/shared/llm/prepare-highlight-excerpts';
import { buildScopeQueryRequest } from '@/shared/llm/scope-query-request';

type StreamAPI = ReturnType<typeof useLLMStream>;

export interface ScopeAskParams {
  question: string;
  scopeLabel: string;
  scopeKind: ScopeKind;
  highlights: PromptHighlight[];
  fetchPageContext: FetchPageContextFn;
}

export interface ScopeAskResult {
  cacheNote: string | null;
  errorNote: string | null;
}

export function useScopeQuery(): Omit<StreamAPI, 'start'> & {
  ask: (params: ScopeAskParams) => Promise<ScopeAskResult | undefined>;
  isPreparing: boolean;
  prepareError: string | null;
} {
  const stream = useLLMStream();
  const { provider } = useActiveLLMProvider();
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const ask = useCallback(async ({
    question,
    scopeLabel,
    scopeKind,
    highlights,
    fetchPageContext,
  }: ScopeAskParams): Promise<ScopeAskResult | undefined> => {
    const trimmed = question.trim();
    if (!trimmed) return undefined;

    setPrepareError(null);
    setIsPreparing(true);

    try {
      const { excerpts, cacheNote, errorNote } = await prepareHighlightExcerpts(
        highlights,
        fetchPageContext,
      );

      stream.start({
        template: 'askScope',
        highlights,
        request: buildScopeQueryRequest({
          scope: { scopeLabel, scopeKind, highlightCount: highlights.length },
          excerpts,
          question: trimmed,
        }),
        provider: provider ?? undefined,
      });

      return { cacheNote, errorNote };
    } catch (err) {
      setPrepareError((err as Error).message);
      throw err;
    } finally {
      setIsPreparing(false);
    }
  }, [stream, provider]);

  return {
    ...stream,
    ask,
    isPreparing,
    prepareError,
  };
}
