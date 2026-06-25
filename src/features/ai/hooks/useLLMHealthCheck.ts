import { useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { HealthCheckResult } from '@/shared/interfaces/i-llm-service';
import { IPC_AI_HEALTH_CHECK } from '@/shared/schemas/message-schemas';

export function useLLMHealthCheck(): {
  run: (provider: 'anthropic' | 'ollama', apiBase?: string) => Promise<{ success: true; data: HealthCheckResult } | { success: false; error: string }>;
} {
  const check = useIpcAction<{ provider: 'anthropic' | 'ollama'; apiBase?: string }, HealthCheckResult>(IPC_AI_HEALTH_CHECK);
  const run = useCallback(async (provider: 'anthropic' | 'ollama', apiBase?: string) => {
    return check({ provider, apiBase });
  }, [check]);
  return { run };
}