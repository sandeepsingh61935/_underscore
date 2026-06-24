import { useEffect, useState, useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { IPC_AI_GET_API_KEY_STATUS, IPC_AI_SET_API_KEY } from '@/shared/schemas/message-schemas';

type ProviderName = 'anthropic' | 'ollama';

export function useAPIKeyStatus(provider: ProviderName) {
  const getStatus = useIpcAction<{ provider: ProviderName }, { configured: boolean }>(IPC_AI_GET_API_KEY_STATUS);
  const setKey = useIpcAction<{ provider: ProviderName; key: string }, { ok: true }>(IPC_AI_SET_API_KEY);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getStatus({ provider });
    if (result.success) setConfigured(result.data.configured);
    else { setError(result.error); setConfigured(false); }
  }, [getStatus, provider]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (key: string) => {
    const result = await setKey({ provider, key });
    if (result.success) await refresh();
    else setError(result.error);
  }, [setKey, provider, refresh]);

  return { configured, error, refresh, save };
}