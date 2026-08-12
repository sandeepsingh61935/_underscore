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

function hasChromeRuntimeConnect(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.connect === 'function';
}

/**
 * Resolve runtime: explicit context, else extension Port adapter.
 * Web product must wrap with WebLlmRuntimeProvider — no silent chrome fallback off-extension.
 */
export function useLlmRuntime(): ILlmRuntime {
  const ctx = useContext(LlmRuntimeContext);
  const fallback = useMemo(() => {
    if (hasChromeRuntimeConnect()) {
      return createExtensionLlmRuntime();
    }
    return null;
  }, []);

  if (ctx) return ctx;
  if (fallback) return fallback;

  throw new Error(
    'LlmRuntimeProvider is required outside the Chrome extension (web must use WebLlmRuntimeProvider).',
  );
}
