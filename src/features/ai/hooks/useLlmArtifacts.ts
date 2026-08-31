/**
 * @file useLlmArtifacts.ts
 * @description Load and save persisted LLM artifacts for a scope.
 */

import { useCallback, useEffect, useState } from 'react';

import { isArtifactStale } from '@/shared/llm/llm-artifact-service';
import { getLlmArtifactsByScope, saveLlmArtifact } from '@/shared/llm/llm-artifact-store';
import type {
  LlmArtifact,
  LlmArtifactKind,
  LlmArtifactScope,
  SaveLlmArtifactInput,
} from '@/shared/schemas/llm-artifact-schema';

export function useLlmArtifacts(scope: LlmArtifactScope | null): {
  artifacts: LlmArtifact[];
  isLoading: boolean;
  reload: () => Promise<void>;
  save: (input: SaveLlmArtifactInput) => Promise<LlmArtifact | null>;
  getByKind: (kind: LlmArtifactKind) => LlmArtifact | undefined;
  getQueries: () => LlmArtifact[];
  isStale: (artifact: LlmArtifact, currentHighlightCount: number) => boolean;
} {
  const [artifacts, setArtifacts] = useState<LlmArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!scope) {
      setArtifacts([]);
      return;
    }
    setIsLoading(true);
    try {
      const loaded = await getLlmArtifactsByScope(scope);
      setArtifacts(loaded);
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (input: SaveLlmArtifactInput): Promise<LlmArtifact | null> => {
      try {
        const saved = await saveLlmArtifact(input);
        await reload();
        return saved;
      } catch {
        return null;
      }
    },
    [reload]
  );

  const getByKind = useCallback(
    (kind: LlmArtifactKind) => {
      const matches = artifacts.filter((a) => a.kind === kind);
      return matches.length > 0 ? matches[matches.length - 1] : undefined;
    },
    [artifacts]
  );

  const getQueries = useCallback(
    () => artifacts.filter((a) => a.kind === 'scope_query'),
    [artifacts]
  );

  return {
    artifacts,
    isLoading,
    reload,
    save,
    getByKind,
    getQueries,
    isStale: isArtifactStale,
  };
}
