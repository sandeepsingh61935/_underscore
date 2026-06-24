import { describe, it, expect, vi } from 'vitest';

import { registerAiHandlers } from '../ipc-handlers';
import type { ILLMService, LLMResult } from '@/shared/interfaces/i-llm-service';

function makeMessageBus() {
  const handlers = new Map<string, (payload: unknown) => Promise<unknown> | unknown>();
  return {
    handlers,
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: (type: string, handler: (p: unknown) => unknown) => handlers.set(type, handler),
  };
}

function makeRegistry(providers: Map<string, ILLMService>) {
  return {
    get: (name: string) => {
      const p = providers.get(name);
      if (!p) throw new Error('not registered');
      return p;
    },
    list: () => Array.from(providers.entries()).map(([name]) => ({ name: name as any, configured: true })),
    setConfigured: vi.fn(),
  };
}

function makeKeyStore() {
  return { get: vi.fn(async () => 'sk-test'), set: vi.fn(), clear: vi.fn() };
}

describe('registerAiHandlers', () => {
  it('IPC_AI_LIST_PROVIDERS returns registered providers', async () => {
    const bus = makeMessageBus();
    const registry = makeRegistry(new Map([
      ['anthropic', { providerName: 'anthropic' } as unknown as ILLMService],
    ]));
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any });
    const handler = bus.handlers.get('IPC_AI_LIST_PROVIDERS')!;
    const result = await handler({});
    expect(result).toEqual([{ name: 'anthropic', configured: true }]);
  });

  it('IPC_AI_CHAT resolves the API key and calls provider.chat', async () => {
    const bus = makeMessageBus();
    const chatResult: LLMResult = { text: 'ok', inputTokens: 1, outputTokens: 1, durationMs: 1 };
    const anthropic: ILLMService = {
      providerName: 'anthropic',
      capabilities: { contextWindow: 1, supportsSystemPrompt: true, supportsStreaming: true, supportsToolUse: false },
      streamChat: async () => chatResult,
      chat: vi.fn(async () => chatResult),
      healthCheck: async () => ({ ok: true, model: 'x' }),
    };
    const registry = makeRegistry(new Map([['anthropic', anthropic]]));
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any });

    const handler = bus.handlers.get('IPC_AI_CHAT')!;
    const result = await handler({ provider: 'anthropic', request: { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 } });
    // When the registry already has a provider, keyStore is bypassed — the
    // provider's own config is authoritative.
    expect(anthropic.chat).toHaveBeenCalled();
    expect(result).toEqual(chatResult);
  });

  it('IPC_AI_HEALTH_CHECK returns provider health', async () => {
    const bus = makeMessageBus();
    const anthropic: ILLMService = {
      providerName: 'anthropic',
      capabilities: { contextWindow: 1, supportsSystemPrompt: true, supportsStreaming: true, supportsToolUse: false },
      streamChat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      healthCheck: vi.fn(async () => ({ ok: true, model: 'claude-sonnet-4-6' })),
    };
    const registry = makeRegistry(new Map([['anthropic', anthropic]]));
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any });

    const handler = bus.handlers.get('IPC_AI_HEALTH_CHECK')!;
    const result = await handler({ provider: 'anthropic' });
    expect(anthropic.healthCheck).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, model: 'claude-sonnet-4-6' });
  });

  it('IPC_AI_SET_API_KEY persists to keyStore', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any });

    const handler = bus.handlers.get('IPC_AI_SET_API_KEY')!;
    await handler({ provider: 'anthropic', key: 'sk-x' });
    expect(keyStore.set).toHaveBeenCalledWith('anthropic', 'sk-x');
  });
});