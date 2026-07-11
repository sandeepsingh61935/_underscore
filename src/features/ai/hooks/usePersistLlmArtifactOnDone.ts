/**
 * @file usePersistLlmArtifactOnDone.ts
 * @description Save LLM stream output when streaming completes.
 */

import { useEffect, useRef } from 'react';

import type { StreamStatus } from '@/features/ai/hooks/useLLMStream';
import type { SaveLlmArtifactInput } from '@/shared/schemas/llm-artifact-schema';

export function usePersistLlmArtifactOnDone(params: {
  status: StreamStatus;
  content: string;
  input: SaveLlmArtifactInput | null;
  save: (input: SaveLlmArtifactInput) => Promise<unknown>;
}): void {
  const savedRef = useRef<string | null>(null);
  const { status, content, input, save } = params;

  useEffect(() => {
    if (status !== 'done' || !input || !content.trim()) return;

    const key = `${input.kind}:${JSON.stringify(input.scope)}:${content.length}`;
    if (savedRef.current === key) return;
    savedRef.current = key;

    void save({ ...input, content: content.trim() });
  }, [status, content, input, save]);
}
