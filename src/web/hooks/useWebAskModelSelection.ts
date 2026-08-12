/**
 * Web: single owner for Ask model chip + default provider + prefs push.
 * Same selection shape as extension useAskModelSelection.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { PROVIDER_META } from '@/features/ai/constants/provider-setup';
import type { AskModelSelection } from '@/features/ai/hooks/useAskModelSelection';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  listAskModelOptions,
  resolveActiveAskOption,
} from '@/shared/llm/ask-model-options';
import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';
import { pushWebAiPreferences } from '@/web/lib/syncWebAiPreferences';
import {
  isProviderConfigured,
  readWebLlmState,
  resolveActiveProvider,
  setDefaultProvider,
  WEB_LLM_CHANGED_EVENT,
  type WebLlmState,
} from '@/web/lib/webLlmKeys';

function buildOptions(state: WebLlmState) {
  const configured = IN_APP_LLM_PROVIDER_ORDER.filter((id) =>
    isProviderConfigured(state, id),
  );
  const models: Partial<Record<ProviderName, string | null | undefined>> = {};
  for (const id of IN_APP_LLM_PROVIDER_ORDER) {
    models[id] = state.providers[id]?.model;
  }
  return listAskModelOptions(configured, models, PROVIDER_META, {
    enabledProviders: state.enabledProviders ?? [],
  });
}

export function useWebAskModelSelection(opts: {
  isAuthenticated: boolean;
  userId?: string | null;
}): AskModelSelection {
  const [llmState, setLlmState] = useState<WebLlmState>(() => readWebLlmState());
  const [selectError, setSelectError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLlmState(readWebLlmState());
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = (): void => {
      void refresh();
    };
    window.addEventListener(WEB_LLM_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_LLM_CHANGED_EVENT, onChange);
  }, [refresh]);

  const options = useMemo(() => buildOptions(llmState), [llmState]);
  const resolved = useMemo(
    () => resolveActiveAskOption(options, resolveActiveProvider(llmState)),
    [options, llmState],
  );

  // Heal default when none stored but configured options exist (label ≡ gate).
  useEffect(() => {
    if (!resolved) return;
    if (llmState.defaultProvider === resolved.provider) return;
    const storedOk =
      llmState.defaultProvider != null &&
      options.some((o) => o.provider === llmState.defaultProvider);
    if (storedOk) return;
    setLlmState(setDefaultProvider(resolved.provider));
  }, [resolved, llmState.defaultProvider, options]);

  const selectProvider = useCallback(
    async (provider: ProviderName): Promise<boolean> => {
      setSelectError(null);
      try {
        const next = setDefaultProvider(provider);
        setLlmState(next);
        if (!opts.isAuthenticated || !opts.userId) return true;
        try {
          const supabase = getWebSupabaseClient();
          const result = await pushWebAiPreferences(supabase, opts.userId, next);
          setLlmState(result.state);
        } catch {
          // Local write applied; sync best-effort.
          // eslint-disable-next-line no-console -- ops signal
          console.warn('[ai_prefs_sync_failed] web ask model switch');
        }
        return true;
      } catch (err) {
        setSelectError((err as Error).message || 'Could not switch model');
        return false;
      }
    },
    [opts.isAuthenticated, opts.userId],
  );

  const clearSelectError = useCallback(() => setSelectError(null), []);

  return {
    options,
    activeProvider: resolved?.provider ?? null,
    activeLabel: resolved?.label ?? 'No model',
    selectProvider,
    selectError,
    clearSelectError,
    refresh,
    ready: true,
  };
}
