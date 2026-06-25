import { useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { IPC_AI_HEALTH_CHECK } from '@/shared/schemas/message-schemas';

export function useLLMHealthCheck(): {
  run: (provider: ProviderName, apiBase?: string) => Promise<{ success: true; data: HealthCheckResult } | { success: false; error: string }>;
} {
  const check = useIpcAction<{ provider: ProviderName; apiBase?: string }, HealthCheckResult>(IPC_AI_HEALTH_CHECK);
  const run = useCallback(async (provider: ProviderName, apiBase?: string) => {
    return check({ provider, apiBase });
  }, [check]);
  return { run };
}