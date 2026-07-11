import { useEffect, useState, useCallback } from 'react';

import { useIpcAction, type ActionResult } from '@/shared/hooks/useIpcAction';
import { IPC_AI_GET_API_KEY_STATUS, IPC_AI_SET_API_KEY } from '@/shared/schemas/message-schemas';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface SaveProviderSettingsInput {
  key?: string;
  model?: string;
}

export function useAPIKeyStatus(provider: ProviderName): {
  configured: boolean | null;
  model: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  save: (input: SaveProviderSettingsInput) => Promise<ActionResult<{ ok: true }>>;
} {
  const getStatus = useIpcAction<{ provider: ProviderName }, { configured: boolean; model: string }>(
    IPC_AI_GET_API_KEY_STATUS,
  );
  const setKey = useIpcAction<{ provider: ProviderName; key?: string; model?: string }, { ok: true }>(
    IPC_AI_SET_API_KEY,
  );

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getStatus({ provider });
    if (result.success) {
      setConfigured(result.data.configured);
      setModel(result.data.model);
    } else {
      setError(result.error);
      setConfigured(false);
      setModel(null);
    }
  }, [getStatus, provider]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (input: SaveProviderSettingsInput): Promise<ActionResult<{ ok: true }>> => {
    const result = await setKey({ provider, key: input.key, model: input.model });
    if (result.success) {
      setError(null);
      await refresh();
    } else {
      setError(result.error);
    }
    return result;
  }, [setKey, provider, refresh]);

  return { configured, model, error, refresh, save };
}
