import { useCallback, useState } from 'react';

import { useActiveLLMProvider } from './useActiveLLMProvider';
import { useLLMChat } from './useLLMChat';
import { useLLMStream } from './useLLMStream';

import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { PromptContext, PromptHighlight } from '@/shared/llm/prompts';
import {
  getCachedSectionSummary,
  setCachedSectionSummary,
  toSectionDigests,
} from '@/shared/llm/section-summary-cache';
import { saveLlmArtifact } from '@/shared/llm/llm-artifact-store';
import { summarizeSectionText } from '@/shared/llm/summarization-pipeline';
import { buildReduceDomainRequest } from '@/shared/llm/summary-request';
import { getSectionKey } from '@/shared/utils/section-key';

type StreamAPI = ReturnType<typeof useLLMStream>;
export type SynthesizePhase = 'idle' | 'sections' | 'streaming' | 'done' | 'error';

interface SynthesizeStartInput {
  ctx: PromptContext;
  excerpts: HighlightExcerpt[];
  /** Optional path per highlight for section grouping. */
  paths?: Record<string, string>;
}

export function useSynthesizeDomain(): Omit<StreamAPI, 'start'> & {
  phase: SynthesizePhase;
  sectionProgress: { current: number; total: number };
  start: (input: SynthesizeStartInput) => Promise<void>;
} {
  const stream = useLLMStream();
  const { chat } = useLLMChat();
  const { provider } = useActiveLLMProvider();
  const [phase, setPhase] = useState<SynthesizePhase>('idle');
  const [sectionProgress, setSectionProgress] = useState({ current: 0, total: 0 });

  const start = useCallback(async ({ ctx, excerpts, paths }: SynthesizeStartInput) => {
    const activeProvider = provider ?? undefined;
    const domain = ctx.domain ?? 'this domain';

    const bySection = new Map<string, { highlights: PromptHighlight[]; excerpts: HighlightExcerpt[] }>();
    for (const excerpt of excerpts) {
      const path = paths?.[excerpt.id] ?? new URL(excerpt.url).pathname;
      const sectionKey = getSectionKey({ url: excerpt.url, path });
      const bucket = bySection.get(sectionKey) ?? { highlights: [], excerpts: [] };
      const hl = ctx.highlights.find(h => h.id === excerpt.id);
      if (hl) bucket.highlights.push(hl);
      bucket.excerpts.push(excerpt);
      bySection.set(sectionKey, bucket);
    }

    const sections = [...bySection.entries()];
    setPhase('sections');
    setSectionProgress({ current: 0, total: sections.length });

    const digests: Array<{ sectionKey: string; summary: string; highlightCount: number }> = [];

    try {
      for (let i = 0; i < sections.length; i += 1) {
        const [sectionKey, bucket] = sections[i]!;
        const count = bucket.excerpts.length;
        const cached = await getCachedSectionSummary(domain, sectionKey, count);
        if (cached) {
          digests.push({ sectionKey, summary: cached, highlightCount: count });
        } else {
          const sectionCtx: PromptContext = {
            ...ctx,
            pageTitle: sectionKey,
            pageUrl: bucket.excerpts[0]?.url ?? '',
            highlights: bucket.highlights,
          };
          const summary = await summarizeSectionText(
            sectionCtx,
            bucket.excerpts,
            (request, prov) => chat(request, prov ?? activeProvider),
            activeProvider,
          );
          await setCachedSectionSummary(domain, sectionKey, count, summary);
          await saveLlmArtifact({
            kind: 'section_summary',
            scope: { kind: 'section', domain, sectionKey },
            content: summary,
            highlightCountAtGeneration: count,
            provider: activeProvider,
          });
          digests.push({ sectionKey, summary, highlightCount: count });
        }
        setSectionProgress({ current: i + 1, total: sections.length });
      }

      setPhase('streaming');
      stream.start({
        template: 'synthesizeDomain',
        highlights: ctx.highlights,
        request: buildReduceDomainRequest(
          domain,
          toSectionDigests(digests),
          ctx.highlights.length,
        ),
        provider: activeProvider,
      });
    } catch (err) {
      setPhase('error');
      stream.abort();
      throw err;
    }
  }, [stream, chat, provider]);

  const derivedPhase: SynthesizePhase = stream.status === 'done'
    ? 'done'
    : stream.status === 'error'
      ? 'error'
      : phase;

  return {
    ...stream,
    phase: derivedPhase,
    sectionProgress,
    start,
  };
}
