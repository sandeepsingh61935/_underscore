import type { LLMKeyStore } from './llm-key-store';
import type { LLMRegistry } from './llm-registry';

import type { ILLMService, LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_LIST_PROVIDERS,
  createErrorResponse,
  createSuccessResponse,
} from '@/shared/schemas/message-schemas';

import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import { MiniMaxProvider } from './minimax-provider';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider as OpenRouterServiceProvider } from './openrouter-provider';

interface MessageBusLike {
  subscribe(messageType: string, handler: (payload: unknown) => unknown | Promise<unknown>): () => void;
}

interface RegisterArgs {
  bus: MessageBusLike;
  registry: LLMRegistry;
  keyStore: LLMKeyStore;
}

/** Providers that don't require an API key. */
const KEYLESS_PROVIDERS: ReadonlyArray<ProviderName> = ['ollama'];

interface ChatPayload {
  provider: ProviderName;
  request: LLMRequest;
}

interface HealthPayload {
  provider: ProviderName;
  apiBase?: string;
}

interface SetKeyPayload {
  provider: ProviderName;
  key: string;
}

interface StatusPayload {
  provider: ProviderName;
}

export function registerAiHandlers({ bus, registry, keyStore }: RegisterArgs): void {
  bus.subscribe(IPC_AI_LIST_PROVIDERS, async () => {
    return safeInvoke(() => registry.list());
  });

  bus.subscribe(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    return safeInvoke(async () => {
      const { provider } = raw as StatusPayload;
      if (KEYLESS_PROVIDERS.includes(provider)) return { configured: true };
      const key = await keyStore.get(provider);
      return { configured: !!key };
    });
  });

  bus.subscribe(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    return safeInvoke(async () => {
      const { provider, key } = raw as SetKeyPayload;
      await keyStore.set(provider, key);
      registry.setConfigured(provider, true);
      return { ok: true };
    });
  });

  bus.subscribe(IPC_AI_HEALTH_CHECK, async (raw: unknown) => {
    return safeInvoke(async () => {
      const { provider, apiBase } = raw as HealthPayload;
      const registered = tryGetRegistered(registry, provider);
      if (registered) return registered.healthCheck();
      const providerInstance = await buildProvider(provider, keyStore, apiBase);
      return providerInstance.healthCheck();
    });
  });

  bus.subscribe(IPC_AI_CHAT, async (raw: unknown) => {
    return safeInvoke(async () => {
      const { provider, request } = raw as ChatPayload;
      const registered = tryGetRegistered(registry, provider);
      if (registered) return registered.chat(request);
      const providerInstance = await buildProvider(provider, keyStore);
      return providerInstance.chat(request);
    });
  });
}

/**
 * Wrap a handler's body so that:
 *  - successful results are returned as MessageResponse envelopes
 *    (createSuccessResponse) — useIpcAction in the popup expects
 *    `{ success, data }` and would otherwise treat raw objects as
 *    errors.
 *  - thrown errors (e.g. "API key not configured", network failures
 *    during healthCheck) become createErrorResponse envelopes so the
 *    popup gets a structured failure rather than a closed port.
 */
async function safeInvoke<T>(fn: () => Promise<T> | T): Promise<ReturnType<typeof createSuccessResponse<T>> | ReturnType<typeof createErrorResponse>> {
  try {
    const data = await fn();
    return createSuccessResponse(data);
  } catch (err) {
    console.error('[safeInvoke] Error caught:', err);
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(message);
  }
}

function tryGetRegistered(registry: LLMRegistry, name: ProviderName): ILLMService | null {
  try {
    return registry.get(name);
  } catch {
    return null;
  }
}

async function buildProvider(
  provider: ProviderName,
  keyStore: LLMKeyStore,
  apiBase?: string
): Promise<ILLMService> {
  try {
    switch (provider) {
      case 'anthropic': {
        const key = await keyStore.get(provider);
        if (!key) throw new Error('API key not configured');
        return new AnthropicProvider({ apiKey: key });
      }
      case 'gemini': {
        const key = await keyStore.get(provider);
        if (!key) throw new Error('API key not configured');
        return new GeminiProvider({ apiKey: key, apiBase });
      }
      case 'openai': {
        const key = await keyStore.get(provider);
        if (!key) throw new Error('API key not configured');
        return new OpenAIProvider({ apiKey: key });
      }
      case 'openrouter': {
        const key = await keyStore.get(provider);
        if (!key) throw new Error('API key not configured');
        return new OpenRouterServiceProvider({ apiKey: key });
      }
      case 'minimax': {
        const key = await keyStore.get(provider);
        if (!key) throw new Error('API key not configured');
        return new MiniMaxProvider({ apiKey: key });
      }
      case 'ollama': {
        return new OllamaProvider({ apiBase });
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (err) {
    throw err;
  }
}