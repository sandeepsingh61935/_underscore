import { useCallback } from 'react';

import type {
  LLMRequest,
  LLMResult,
  ProviderName,
} from '@/shared/interfaces/i-llm-service';
import { sendLlmChat } from '@/shared/llm/llm-ipc-chat';

export function useLLMChat(): {
  chat: (
    request: LLMRequest,
    provider?: ProviderName
  ) => Promise<{ success: true; data: LLMResult } | { success: false; error: string }>;
} {
  const chat = useCallback(async (request: LLMRequest, provider?: ProviderName) => {
    return sendLlmChat({ request, ...(provider ? { provider } : {}) });
  }, []);

  return { chat };
}
