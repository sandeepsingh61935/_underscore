import { useCallback } from 'react';

import { useLLMStream } from './useLLMStream';
import { PROMPT_TEMPLATES } from '@/shared/llm/prompts';
import type { PromptContext } from '@/shared/llm/prompts';

export function useGenerateSummary() {
  const stream = useLLMStream();

  const start = useCallback((ctx: PromptContext) => {
    const request = {
      systemPrompt: PROMPT_TEMPLATES.summarizePage(ctx),
      messages: [{ role: 'user' as const, content: ctx.pageContextWithMarks }],
      maxTokens: 1024,
    };
    stream.start({ template: 'summarizePage', highlights: ctx.highlights, request });
  }, [stream]);

  return { ...stream, start };
}