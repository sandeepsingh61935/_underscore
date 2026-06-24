import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_LIST_PROVIDERS,
} from '@/shared/schemas/message-schemas';
import type { ILLMService, LLMRequest } from '@/shared/interfaces/i-llm-service';
import type { LLMRegistry } from './llm-registry';
import type { LLMKeyStore } from './llm-key-store';

interface MessageBusLike {
  on(type: string, handler: (payload: unknown) => unknown | Promise<unknown>): void;
}

interface RegisterArgs {
  bus: MessageBusLike;
  registry: LLMRegistry;
  keyStore: LLMKeyStore;
}

type ProviderName = 'anthropic' | 'ollama';

export function registerAiHandlers({ bus, registry, keyStore }: RegisterArgs): void {
  bus.on(IPC_AI_LIST_PROVIDERS, () => registry.list());

  bus.on(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    const { provider } = raw as { provider: ProviderName };
    const key = await keyStore.get(provider);
    return { configured: !!key };
  });

  bus.on(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    const { provider, key } = raw as { provider: ProviderName; key: string };
    await keyStore.set(provider, key);
    registry.setConfigured(provider, true);
    return { ok: true };
  });

  bus.on(IPC_AI_HEALTH_CHECK, async (raw: unknown) => {
    const { provider, apiBase } = raw as { provider: ProviderName; apiBase?: string };
    // Prefer a registered provider instance (lets tests inject mocks).
    const registered = tryGetRegistered(registry, provider);
    if (registered) return registered.healthCheck();
    if (provider === 'ollama') {
      // Ollama doesn't require a key; the provider is created from apiBase.
      const { OllamaProvider } = await import('./ollama-provider');
      return new OllamaProvider({ apiBase }).healthCheck();
    }
    const key = await keyStore.get(provider);
    if (!key) return { ok: false, model: 'unknown', error: 'API key not configured' };
    const { AnthropicProvider } = await import('./anthropic-provider');
    return new AnthropicProvider({ apiKey: key }).healthCheck();
  });

  bus.on(IPC_AI_CHAT, async (raw: unknown) => {
    const { provider, request } = raw as { provider: ProviderName; request: LLMRequest };
    // Prefer a registered provider instance (lets tests inject mocks).
    const registered = tryGetRegistered(registry, provider);
    if (registered) return registered.chat(request);
    if (provider === 'ollama') {
      // Ollama apiBase would normally be passed here; for the baseline
      // implementation we use the default localhost endpoint.
      const { OllamaProvider } = await import('./ollama-provider');
      return new OllamaProvider({}).chat(request);
    }
    const key = await keyStore.get(provider);
    if (!key) throw new Error('API key not configured');
    const { AnthropicProvider } = await import('./anthropic-provider');
    return new AnthropicProvider({ apiKey: key }).chat(request);
  });
}

function tryGetRegistered(registry: LLMRegistry, name: ProviderName): ILLMService | null {
  try {
    return registry.get(name);
  } catch {
    return null;
  }
}