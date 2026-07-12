import { describe, it, expect, vi } from 'vitest';

import { registerAiHandlers } from '@/background/services/llm/ipc-handlers';
import type { ILLMService, LLMResult } from '@/shared/interfaces/i-llm-service';
import type { FeatureGateContext } from '@/shared/utils/mode-capabilities';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';
import { IPC_AI_CHAT, IPC_AI_SET_API_KEY } from '@/shared/schemas/message-schemas';

function makeMessageBus() {
  const handlers = new Map<string, (payload: unknown) => Promise<unknown> | unknown>();
  return {
    handlers,
    subscribe: (type: string, handler: (p: unknown) => unknown) => {
      handlers.set(type, handler);
      return () => {};
    },
  };
}

function makeKeyStore() {
  return {
    get: vi.fn(async () => 'sk-test'),
    set: vi.fn(),
    clear: vi.fn(),
    getModel: vi.fn(async () => 'model'),
    setModel: vi.fn(),
    getActiveProvider: vi.fn(async () => 'anthropic'),
    setActiveProvider: vi.fn(),
  };
}

function makePageContentCache() {
  return { getByUrl: vi.fn(() => null), set: vi.fn(), deleteTab: vi.fn() };
}

function makeRegistry(providers: Map<string, ILLMService>) {
  return {
    get: (name: string) => {
      const provider = providers.get(name);
      if (!provider) throw new Error('not registered');
      return provider;
    },
    list: () => Array.from(providers.entries()).map(([name]) => ({ name, configured: true })),
    setConfigured: vi.fn(),
  };
}

function proContext(): FeatureGateContext {
  return {
    mode: 'pro',
    capabilities: getCapabilitiesForMode('pro'),
    isAuthenticated: true,
    storageScope: 'pro',
  };
}

function proXaiContext(overrides: Partial<FeatureGateContext> = {}): FeatureGateContext {
  return {
    mode: 'pro_xai',
    capabilities: getCapabilitiesForMode('pro_xai'),
    isAuthenticated: true,
    storageScope: 'pro',
    ...overrides,
  };
}

describe('registerAiHandlers AI feature gate', () => {
  it('denies IPC_AI_CHAT when gate resolver reports Pro (not 10x-Pro)', async () => {
    const bus = makeMessageBus();
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry(new Map()) as never,
      keyStore: makeKeyStore() as never,
      pageContentCache: makePageContentCache() as never,
      resolveAiGateContext: async () => proContext(),
    });

    const handler = bus.handlers.get(IPC_AI_CHAT)!;
    const result = await handler({
      provider: 'anthropic',
      request: { systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }], maxTokens: 10 },
    });

    expect(result).toEqual({ success: false, error: 'Available in 10x-Pro' });
  });

  it('allows IPC_AI_SET_API_KEY on pro_xai', async () => {
    const bus = makeMessageBus();
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry(new Map()) as never,
      keyStore: makeKeyStore() as never,
      pageContentCache: makePageContentCache() as never,
      resolveAiGateContext: async () => proXaiContext(),
    });

    const handler = bus.handlers.get(IPC_AI_SET_API_KEY)!;
    const result = await handler({ provider: 'anthropic', key: 'sk-x' });

    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it('allows IPC_AI_CHAT when gate resolver reports pro_xai', async () => {
    const bus = makeMessageBus();
    const chatResult: LLMResult = { text: 'ok', inputTokens: 1, outputTokens: 1, durationMs: 1 };
    const anthropic: ILLMService = {
      providerName: 'anthropic',
      capabilities: {
        contextWindow: 1,
        supportsSystemPrompt: true,
        supportsStreaming: true,
        supportsToolUse: false,
      },
      streamChat: async () => chatResult,
      chat: vi.fn(async () => chatResult),
      healthCheck: async () => ({ ok: true, model: 'x' }),
    };

    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry(new Map([['anthropic', anthropic]])) as never,
      keyStore: makeKeyStore() as never,
      pageContentCache: makePageContentCache() as never,
      resolveAiGateContext: async () => proXaiContext(),
    });

    const handler = bus.handlers.get(IPC_AI_CHAT)!;
    const result = await handler({
      provider: 'anthropic',
      request: { systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }], maxTokens: 10 },
    });

    expect(anthropic.chat).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: chatResult });
  });
});
