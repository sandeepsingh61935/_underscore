import { useCallback, useEffect, useState } from 'react';

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { loadInAppCatalog } from '@/shared/llm/catalog-load';
import { fetchProviderModels } from '@/shared/llm/model-discovery';
import type { ProviderModelOption } from '@/shared/llm/provider-models';
import { hasChromeRuntime, useIpcAction } from '@/shared/hooks/useIpcAction';
import { IPC_AI_LIST_PROVIDER_MODELS } from '@/shared/schemas/message-schemas';

export interface UseProviderModelsInput {
  apiKey?: string;
  apiBase?: string;
  /** When true, load models via background IPC using stored credentials. */
  useStoredCredentials?: boolean;
}

export function useProviderModels(
  provider: ProviderName | null,
  input: UseProviderModelsInput = {},
): {
  models: ProviderModelOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const listViaIpc = useIpcAction<
    { provider: ProviderName; apiBase?: string },
    { models: ProviderModelOption[] }
  >(IPC_AI_LIST_PROVIDER_MODELS);

  const [models, setModels] = useState<ProviderModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!provider) {
      setModels([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const presented = await loadInAppCatalog(
        {
          provider,
          apiKey: input.apiKey,
          apiBase: input.apiBase,
          useStoredCredentials: input.useStoredCredentials,
          refresh,
        },
        {
          fetchLive: async (id, opts) => {
            if (id === 'openrouter') {
              const { getOpenRouterModels } = await import('@/shared/llm/openrouter-models');
              return { models: await getOpenRouterModels({ refresh: opts.refresh }) };
            }
            return fetchProviderModels(id, opts);
          },
          listViaIpc: hasChromeRuntime()
            ? async (payload) => {
                const result = await listViaIpc(payload);
                if (result.success) return { ok: true, models: result.data.models };
                return { ok: false, reason: 'error', message: result.error };
              }
            : undefined,
        },
      );
      setModels(presented.models);
      setError(presented.error);
    } finally {
      setLoading(false);
    }
  }, [provider, input.apiKey, input.apiBase, input.useStoredCredentials, listViaIpc]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { models, loading, error, refresh };
}
