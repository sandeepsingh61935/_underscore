import { useCallback, useEffect, useState } from 'react';

import type { ProviderModelOption } from '@/shared/llm/provider-models';
import { getOpenRouterModels } from '@/shared/llm/openrouter-models';

export function useOpenRouterModels(enabled: boolean): {
  models: ProviderModelOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [models, setModels] = useState<ProviderModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!enabled) return;
    setLoading(true);
    try {
      const list = await getOpenRouterModels({ refresh });
      setModels(list);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { models, loading, error, refresh };
}
