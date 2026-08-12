/**
 * Inject ILlmRuntime for feature hooks (ADR-027).
 */

import React, { createContext, useContext, useMemo } from 'react';

import type { ILlmRuntime } from '@/shared/llm/runtime';
import { createExtensionLlmRuntime } from '@/shared/llm/runtime';

const LlmRuntimeContext = createContext<ILlmRuntime | null>(null);

export function LlmRuntimeProvider({
  runtime,
  children,
}: {
  runtime: ILlmRuntime;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <LlmRuntimeContext.Provider value={runtime}>{children}</LlmRuntimeContext.Provider>
  );
}

/**
 * Resolve runtime: explicit context, else extension Port adapter when chrome exists.
 */
export function useLlmRuntime(): ILlmRuntime {
  const ctx = useContext(LlmRuntimeContext);
  const fallback = useMemo(() => createExtensionLlmRuntime(), []);
  return ctx ?? fallback;
}
