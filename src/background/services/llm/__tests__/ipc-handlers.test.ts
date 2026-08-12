import { describe, it, expect, vi } from 'vitest';

import { registerAiHandlers } from '../ipc-handlers';

import type { ILLMService, LLMResult } from '@/shared/interfaces/i-llm-service';

function makeMessageBus() {
  const handlers = new Map<string, (payload: unknown) => Promise<unknown> | unknown>();
  return {
    handlers,
    send: vi.fn(),
    subscribe: (type: string, handler: (p: unknown) => unknown) => { handlers.set(type, handler); return () => {}; },
    unsubscribe: vi.fn(),
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
  return {
    get: vi.fn(async () => 'sk-test'),
    set: vi.fn(),
    clear: vi.fn(),
    getModel: vi.fn(async () => 'claude-sonnet-4-6'),
    setModel: vi.fn(),
    getActiveProvider: vi.fn(async () => null),
    setActiveProvider: vi.fn(),
    getApiBase: vi.fn(async () => 'http://localhost:11434'),
    setApiBase: vi.fn(),
    getOllamaVerified: vi.fn(async () => false),
    setOllamaVerified: vi.fn(),
  };
}

function makePageContentCache() {
  return {
    getByUrl: vi.fn(() => null),
    set: vi.fn(),
    deleteTab: vi.fn(),
  };
}

describe('registerAiHandlers', () => {
  it('IPC_AI_LIST_PROVIDERS returns registered providers', async () => {
    const bus = makeMessageBus();
    const registry = makeRegistry(new Map([
      ['anthropic', { providerName: 'anthropic' } as unknown as ILLMService],
    ]));
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any, pageContentCache: makePageContentCache() as any });
    const handler = bus.handlers.get('IPC_AI_LIST_PROVIDERS')!;
    const result = await handler({});
    expect(result).toEqual({ success: true, data: [{ name: 'anthropic', configured: true }] });
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
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_CHAT')!;
    const result = await handler({ provider: 'anthropic', request: { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 } });
    // When the registry already has a provider, keyStore is bypassed — the
    // provider's own config is authoritative.
    expect(anthropic.chat).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: chatResult });
  });

  it('IPC_AI_HEALTH_CHECK returns error when provider health fails', async () => {
    const bus = makeMessageBus();
    const anthropic: ILLMService = {
      providerName: 'anthropic',
      capabilities: { contextWindow: 1, supportsSystemPrompt: true, supportsStreaming: true, supportsToolUse: false },
      streamChat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      healthCheck: vi.fn(async () => ({ ok: false, model: 'claude-sonnet-4-6', error: 'HTTP 401' })),
    };
    const registry = makeRegistry(new Map([['anthropic', anthropic]]));
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_HEALTH_CHECK')!;
    const result = await handler({ provider: 'anthropic' });
    expect(result).toEqual({ success: false, error: 'HTTP 401' });
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
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: makeKeyStore() as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_HEALTH_CHECK')!;
    const result = await handler({ provider: 'anthropic' });
    expect(anthropic.healthCheck).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: { ok: true, model: 'claude-sonnet-4-6' } });
  });

  it('IPC_AI_SET_API_KEY persists to keyStore', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_SET_API_KEY')!;
    const result = await handler({ provider: 'anthropic', key: 'sk-x' });
    expect(keyStore.set).toHaveBeenCalledWith('anthropic', 'sk-x');
    expect(keyStore.setActiveProvider).toHaveBeenCalledWith('anthropic');
    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it('IPC_AI_SET_API_KEY persists model without changing key', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_SET_API_KEY')!;
    const result = await handler({
      provider: 'openrouter',
      model: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    });
    expect(keyStore.set).not.toHaveBeenCalled();
    expect(keyStore.setModel).toHaveBeenCalledWith(
      'openrouter',
      'nvidia/llama-3.1-nemotron-70b-instruct:free',
    );
    expect(keyStore.setActiveProvider).toHaveBeenCalledWith('openrouter');
    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it('IPC_AI_SET_API_KEY clearKey removes stored key', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_SET_API_KEY')!;
    const result = await handler({ provider: 'anthropic', clearKey: true });
    expect(keyStore.clear).toHaveBeenCalledWith('anthropic');
    expect(registry.setConfigured).toHaveBeenCalledWith('anthropic', false);
    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it('IPC_AI_SET_ACTIVE_PROVIDER switches among configured providers', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    (keyStore.get as ReturnType<typeof vi.fn>).mockResolvedValue('sk-x');
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_SET_ACTIVE_PROVIDER')!;
    const result = await handler({ provider: 'openai' });
    expect(keyStore.setActiveProvider).toHaveBeenCalledWith('openai');
    expect(result).toEqual({ success: true, data: { ok: true, provider: 'openai' } });
  });

  it('IPC_AI_SET_ACTIVE_PROVIDER rejects unconfigured provider', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    (keyStore.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_SET_ACTIVE_PROVIDER')!;
    const result = await handler({ provider: 'anthropic' });
    expect(keyStore.setActiveProvider).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: false });
  });

  it('IPC_AI_GET_API_KEY_STATUS returns configured model', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    (keyStore.getModel as ReturnType<typeof vi.fn>).mockResolvedValue('meta-llama/llama-3.3-70b-instruct:free');
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_GET_API_KEY_STATUS')!;
    const result = await handler({ provider: 'openrouter' });
    expect(result).toEqual({
      success: true,
      data: { configured: true, model: 'meta-llama/llama-3.3-70b-instruct:free' },
    });
  });

  it('IPC_AI_GET_API_KEY_STATUS returns configured=false for ollama until it has been verified', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_GET_API_KEY_STATUS')!;
    const result = await handler({ provider: 'ollama' });
    expect(result).toEqual({
      success: true,
      data: { configured: false, model: 'claude-sonnet-4-6', apiBase: 'http://localhost:11434' },
    });
  });

  it('IPC_AI_GET_API_KEY_STATUS returns configured=true for ollama once verified', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    (keyStore.getOllamaVerified as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const registry = makeRegistry(new Map());
    registerAiHandlers({ bus: bus as any, registry: registry as any, keyStore: keyStore as any, pageContentCache: makePageContentCache() as any });

    const handler = bus.handlers.get('IPC_AI_GET_API_KEY_STATUS')!;
    const result = await handler({ provider: 'ollama' });
    expect(result).toEqual({
      success: true,
      data: { configured: true, model: 'claude-sonnet-4-6', apiBase: 'http://localhost:11434' },
    });
  });

  it('IPC_AI_GET_PAGE_CONTEXT builds marked context from cache', async () => {
    const bus = makeMessageBus();
    const pageContentCache = makePageContentCache();
    (pageContentCache.getByUrl as ReturnType<typeof vi.fn>).mockReturnValue({
      url: 'https://example.com',
      title: 'Example',
      text: 'Hello highlighted world',
      truncated: false,
      originalLength: 23,
      pushedAt: Date.now(),
    });

    registerAiHandlers({
      bus: bus as any,
      registry: makeRegistry(new Map()) as any,
      keyStore: makeKeyStore() as any,
      pageContentCache: pageContentCache as any,
    });

    const handler = bus.handlers.get('IPC_AI_GET_PAGE_CONTEXT')!;
    const result = await handler({
      highlights: [{ id: 'h1', url: 'https://example.com', text: 'highlighted' }],
    }) as { success: true; data: { pageContextWithMarks: string; cacheMissUrls: string[]; highlightExcerpts: Array<{ excerpt: string }> } };

    expect(result.success).toBe(true);
    expect(result.data.pageContextWithMarks).toContain('<mark>highlighted</mark>');
    expect(result.data.cacheMissUrls).toEqual([]);
    expect(result.data.highlightExcerpts).toHaveLength(1);
    expect(result.data.highlightExcerpts[0]?.excerpt).toContain('<mark>highlighted</mark>');
  });
});