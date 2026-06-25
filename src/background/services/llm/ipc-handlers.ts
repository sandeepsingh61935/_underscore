import type { LLMKeyStore } from './llm-key-store';
import type { LLMRegistry } from './llm-registry';

import type { ILLMService, LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_LIST_PROVIDERS,
} from '@/shared/schemas/message-schemas';

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
  bus.subscribe(IPC_AI_LIST_PROVIDERS, () => registry.list());

  bus.subscribe(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    const { provider } = raw as StatusPayload;
    if (KEYLESS_PROVIDERS.includes(provider)) return { configured: true };
    const key = await keyStore.get(provider);
    return { configured: !!key };
  });

  bus.subscribe(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    const { provider, key } = raw as SetKeyPayload;
    await keyStore.set(provider, key);
    registry.setConfigured(provider, true);
    return { ok: true };
  });

  bus.subscribe(IPC_AI_HEALTH_CHECK, async (raw: unknown) => {
    const { provider, apiBase } = raw as HealthPayload;
    const registered = tryGetRegistered(registry, provider);
    if (registered) return registered.healthCheck();
    const providerInstance = await buildProvider(provider, keyStore, apiBase);
    return providerInstance.healthCheck();
  });

  bus.subscribe(IPC_AI_CHAT, async (raw: unknown) => {
    const { provider, request } = raw as ChatPayload;
    const registered = tryGetRegistered(registry, provider);
    if (registered) return registered.chat(request);
    const providerInstance = await buildProvider(provider, keyStore);
    return providerInstance.chat(request);
  });
}

function tryGetRegistered(registry: LLMRegistry, name: ProviderName): ILLMService | null {
  try {
    return registry.get(name);
  } catch {
    return null;
  }
}

async function buildProvider(provider: ProviderName, keyStore: LLMKeyStore, apiBase?: string): Promise<ILLMService> {
  switch (provider) {
    case 'ollama': {
      const { OllamaProvider } = await import('./ollama-provider');
      return new OllamaProvider({ apiBase });
    }
    case 'anthropic': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      const { AnthropicProvider } = await import('./anthropic-provider');
      return new AnthropicProvider({ apiKey: key });
    }
    case 'gemini': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      const { GeminiProvider } = await import('./gemini-provider');
      return new GeminiProvider({ apiKey: key });
    }
    case 'openai': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      const { OpenAIProvider } = await import('./openai-provider');
      return new OpenAIProvider({ apiKey: key });
    }
    case 'openrouter': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      const { OpenRouterProvider } = await import('./openrouter-provider');
      return new OpenRouterProvider({ apiKey: key });
    }
    case 'minimax': {
      const key = await keyStore.get(provider);
      if (!key) throw new Error('API key not configured');
      const { MiniMaxProvider } = await import('./minimax-provider');
      return new MiniMaxProvider({ apiKey: key });
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}