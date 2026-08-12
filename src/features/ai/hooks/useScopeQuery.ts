import { useCallback, useState } from 'react';

import { useLLMStream } from './useLLMStream';

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
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
  /**
   * Explicit in-app provider for this ask. Callers own selection
   * (useAskModelSelection) so chip / gate / stream share one source.
   */
  provider?: ProviderName | null;
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
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const ask = useCallback(async ({
    question,
    scopeLabel,
    scopeKind,
    highlights,
    fetchPageContext,
    provider,
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
  }, [stream]);

  return {
    ...stream,
    ask,
    isPreparing,
    prepareError,
  };
}
