import { useCallback, useEffect, useState } from 'react';

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { IPC_AI_GET_API_KEY_STATUS } from '@/shared/schemas/message-schemas';

export interface ProviderStatusSnapshot {
  configured: boolean | null;
  model: string | null;
}

export function useAllProviderStatuses(
  providers: ReadonlyArray<ProviderName>,
): {
  statuses: Partial<Record<ProviderName, ProviderStatusSnapshot>>;
  refresh: () => Promise<void>;
} {
  const getStatus = useIpcAction<
    { provider: ProviderName },
    { configured: boolean; model: string; apiBase?: string }
  >(IPC_AI_GET_API_KEY_STATUS);

  const [statuses, setStatuses] = useState<Partial<Record<ProviderName, ProviderStatusSnapshot>>>({});

  const refresh = useCallback(async () => {
    const results = await Promise.all(
      providers.map(async provider => {
        const result = await getStatus({ provider });
        if (result.success) {
          return [
            provider,
            { configured: result.data.configured, model: result.data.model },
          ] as const;
        }
        return [provider, { configured: false, model: null }] as const;
      }),
    );
    setStatuses(Object.fromEntries(results));
  }, [getStatus, providers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { statuses, refresh };
}
