import { useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { IPC_AI_HEALTH_CHECK } from '@/shared/schemas/message-schemas';

export interface LLMHealthCheckOptions {
  apiBase?: string;
  model?: string;
}

export function useLLMHealthCheck(): {
  run: (
    provider: ProviderName,
    options?: LLMHealthCheckOptions
  ) => Promise<
    { success: true; data: HealthCheckResult } | { success: false; error: string }
  >;
} {
  const check = useIpcAction<
    { provider: ProviderName; apiBase?: string; model?: string },
    HealthCheckResult
  >(IPC_AI_HEALTH_CHECK);
  const run = useCallback(
    async (provider: ProviderName, options: LLMHealthCheckOptions = {}) => {
      return check({ provider, apiBase: options.apiBase, model: options.model });
    },
    [check]
  );
  return { run };
}
