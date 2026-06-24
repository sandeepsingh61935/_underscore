import { useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { IPC_AI_HEALTH_CHECK } from '@/shared/schemas/message-schemas';
import type { HealthCheckResult } from '@/shared/interfaces/i-llm-service';

export function useLLMHealthCheck() {
  const check = useIpcAction<{ provider: 'anthropic' | 'ollama'; apiBase?: string }, HealthCheckResult>(IPC_AI_HEALTH_CHECK);
  const run = useCallback(async (provider: 'anthropic' | 'ollama', apiBase?: string) => {
    return check({ provider, apiBase });
  }, [check]);
  return { run };
}