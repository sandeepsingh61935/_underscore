import type {
  LLMRequest,
  LLMResult,
  ProviderName,
} from '@/shared/interfaces/i-llm-service';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import { IPC_AI_CHAT } from '@/shared/schemas/message-schemas';

/** LLM inference can exceed the default 5s message-bus timeout. */
export const LLM_CHAT_TIMEOUT_MS = 120_000;

function hasChromeRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function'
  );
}

export async function sendLlmChat(payload: {
  provider?: ProviderName;
  request: LLMRequest;
}): Promise<{ success: true; data: LLMResult } | { success: false; error: string }> {
  if (!hasChromeRuntime()) {
    return {
      success: false,
      error: 'Chrome extension runtime is unavailable in this context.',
    };
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        error: `Message send timeout after ${LLM_CHAT_TIMEOUT_MS}ms (type: ${IPC_AI_CHAT}, target: background)`,
      });
    }, LLM_CHAT_TIMEOUT_MS);

    chrome.runtime.sendMessage(
      { type: IPC_AI_CHAT, payload, timestamp: Date.now() },
      (response: MessageResponse<LLMResult> | undefined) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message ?? 'Chrome runtime error',
          });
          return;
        }
        if (response?.success) {
          resolve({ success: true, data: response.data as LLMResult });
          return;
        }
        resolve({ success: false, error: response?.error ?? 'Unknown IPC error' });
      }
    );
  });
}
