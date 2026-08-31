/**
 * Wire browser ILlmRuntime for product web (ADR-027).
 */

import React, { useMemo } from 'react';

import { LlmRuntimeProvider } from '@/features/ai/runtime/LlmRuntimeContext';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { createBrowserLlmRuntime } from '@/shared/llm/runtime';
import { readWebLlmState, resolveActiveProvider } from '@/web/lib/webLlmKeys';

export function WebLlmRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const runtime = useMemo(
    () =>
      createBrowserLlmRuntime({
        getCredentials: (provider: ProviderName) => {
          const cfg = readWebLlmState().providers[provider];
          if (!cfg) return null;
          return {
            apiKey: cfg.apiKey,
            apiBase: cfg.apiBase,
            model: cfg.model,
          };
        },
        getDefaultProvider: () => resolveActiveProvider(readWebLlmState()),
        getAccessToken: async () => {
          try {
            const supabase = getWebSupabaseClient();
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token ?? null;
          } catch {
            return null;
          }
        },
      }),
    []
  );

  return <LlmRuntimeProvider runtime={runtime}>{children}</LlmRuntimeProvider>;
}
