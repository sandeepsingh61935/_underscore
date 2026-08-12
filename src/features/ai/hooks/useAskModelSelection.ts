/**
 * Extension: single owner for Ask model chip + submit gate + stream provider.
 * activeProvider is resolved (stored active if selectable, else first option).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PROVIDER_META, SETUP_PROVIDERS } from '@/features/ai/constants/provider-setup';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useAllProviderStatuses } from '@/features/ai/hooks/useAllProviderStatuses';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  LLM_ENABLED_PROVIDERS_KEY,
  normalizeEnabledProviders,
} from '@/shared/llm/ai-preferences';
import {
  listAskModelOptions,
  resolveActiveAskOption,
  type AskModelOption,
} from '@/shared/llm/ask-model-options';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { IPC_AI_SET_ACTIVE_PROVIDER } from '@/shared/schemas/message-schemas';

async function readEnabledProvidersLocal(): Promise<ProviderName[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
  try {
    const r = await chrome.storage.local.get(LLM_ENABLED_PROVIDERS_KEY);
    const raw = r[LLM_ENABLED_PROVIDERS_KEY];
    if (!Array.isArray(raw)) return [];
    return normalizeEnabledProviders(raw.filter(isInAppLlmProvider));
  } catch {
    return [];
  }
}

export type AskModelSelection = {
  options: AskModelOption[];
  /** Resolved active for chip + gate + stream (never a label-only lie). */
  activeProvider: ProviderName | null;
  activeLabel: string;
  selectProvider: (provider: ProviderName) => Promise<boolean>;
  selectError: string | null;
  clearSelectError: () => void;
  refresh: () => Promise<void>;
  /** True after first statuses + enablement load. */
  ready: boolean;
};

export function useAskModelSelection(): AskModelSelection {
  const { provider: storedActive, refresh: refreshActive } = useActiveLLMProvider();
  const { statuses, refresh: refreshStatuses } = useAllProviderStatuses(SETUP_PROVIDERS);
  const setActive = useIpcAction<
    { provider: ProviderName },
    { ok: true; provider: ProviderName }
  >(IPC_AI_SET_ACTIVE_PROVIDER);

  const [enabledProviders, setEnabledProviders] = useState<ProviderName[]>([]);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const healKeyRef = useRef<string | null>(null);

  const loadEnablement = useCallback(async () => {
    setEnabledProviders(await readEnabledProvidersLocal());
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshStatuses(), refreshActive(), loadEnablement()]);
    setReady(true);
  }, [refreshStatuses, refreshActive, loadEnablement]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const options = useMemo(() => {
    const configured = SETUP_PROVIDERS.filter((p) => statuses[p]?.configured === true);
    const models: Partial<Record<ProviderName, string | null | undefined>> = {};
    for (const p of SETUP_PROVIDERS) {
      models[p] = statuses[p]?.model ?? null;
    }
    return listAskModelOptions(configured, models, PROVIDER_META, {
      enabledProviders,
    });
  }, [statuses, enabledProviders]);

  const resolved = useMemo(
    () => resolveActiveAskOption(options, storedActive),
    [options, storedActive],
  );

  // Persist fallback when storage has no selectable active (align chip/gate/stream).
  useEffect(() => {
    if (!ready || !resolved) return;
    if (storedActive === resolved.provider) return;
    const storedSelectable =
      storedActive != null && options.some((o) => o.provider === storedActive);
    if (storedSelectable) return;
    const healKey = `${resolved.provider}:${options.map((o) => o.provider).join(',')}`;
    if (healKeyRef.current === healKey) return;
    healKeyRef.current = healKey;
    void (async () => {
      const result = await setActive({ provider: resolved.provider });
      if (result.success) {
        await refreshActive();
      } else {
        // Allow retry on next options change.
        healKeyRef.current = null;
      }
    })();
  }, [ready, resolved, storedActive, options, setActive, refreshActive]);

  const selectProvider = useCallback(
    async (provider: ProviderName): Promise<boolean> => {
      setSelectError(null);
      if (provider === storedActive) return true;
      const result = await setActive({ provider });
      if (!result.success) {
        setSelectError(result.error || 'Could not switch model');
        return false;
      }
      await refresh();
      return true;
    },
    [storedActive, setActive, refresh],
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
    ready,
  };
}
