import { useCallback, useEffect, useState } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { IPC_AI_GET_ACTIVE_PROVIDER } from '@/shared/schemas/message-schemas';

export function useActiveLLMProvider(): {
  provider: ProviderName | null;
  refresh: () => Promise<void>;
} {
  const getActive = useIpcAction<Record<string, never>, { provider: ProviderName | null }>(
    IPC_AI_GET_ACTIVE_PROVIDER,
  );
  const [provider, setProvider] = useState<ProviderName | null>(null);

  const refresh = useCallback(async () => {
    const result = await getActive({});
    if (result.success) setProvider(result.data.provider);
  }, [getActive]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { provider, refresh };
}
