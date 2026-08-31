import { describe, it, expect, vi, beforeEach } from 'vitest';

import { registerAiHandlers } from '@/background/services/llm/ipc-handlers';
import {
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
} from '@/shared/schemas/message-schemas';

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

function makeKeyStore(overrides: Partial<Record<string, unknown>> = {}) {
  const state = {
    ollamaVerified: false,
    model: 'llama3.2',
    apiBase: 'http://localhost:11434',
  };
  return {
    get: vi.fn(async () => null),
    set: vi.fn(),
    clear: vi.fn(),
    getModel: vi.fn(async () => state.model),
    setModel: vi.fn(async (_provider: string, model: string) => {
      state.model = model;
    }),
    getApiBase: vi.fn(async () => state.apiBase),
    setApiBase: vi.fn(async (_provider: string, base: string) => {
      state.apiBase = base;
    }),
    getOllamaVerified: vi.fn(async () => state.ollamaVerified),
    setOllamaVerified: vi.fn(async (v: boolean) => {
      state.ollamaVerified = v;
    }),
    getActiveProvider: vi.fn(async () => 'ollama'),
    setActiveProvider: vi.fn(),
    ...overrides,
  };
}

function makeRegistry() {
  return {
    get: () => {
      throw new Error('not registered');
    },
    list: () => [],
    setConfigured: vi.fn(),
  };
}

function makePageContentCache() {
  return { getByUrl: vi.fn(() => null), set: vi.fn(), deleteTab: vi.fn() };
}

describe('registerAiHandlers — ollama configured state and model-aware health check', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('reports ollama as unconfigured until a health check has actually verified it', async () => {
    const bus = makeMessageBus();
    const keyStore = makeKeyStore();
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry() as never,
      keyStore: keyStore as never,
      pageContentCache: makePageContentCache() as never,
    });

    const status = await bus.handlers.get(IPC_AI_GET_API_KEY_STATUS)!({
      provider: 'ollama',
    });

    expect(status).toEqual({
      success: true,
      data: { configured: false, model: 'llama3.2', apiBase: 'http://localhost:11434' },
    });
  });

  it('fails the health check when the selected model is not in the Ollama catalog', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    } as Response);

    const bus = makeMessageBus();
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry() as never,
      keyStore: makeKeyStore() as never,
      pageContentCache: makePageContentCache() as never,
    });

    const result = await bus.handlers.get(IPC_AI_HEALTH_CHECK)!({
      provider: 'ollama',
      apiBase: 'http://localhost:11434',
      model: 'mistral:latest',
    });

    expect(result).toEqual({
      success: false,
      error: 'Model not installed — run ollama pull mistral:latest',
    });
  });

  it('marks ollama configured only after set-api-key is called with a verified model', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    } as Response);

    const bus = makeMessageBus();
    const registry = makeRegistry();
    const keyStore = makeKeyStore();
    registerAiHandlers({
      bus: bus as never,
      registry: registry as never,
      keyStore: keyStore as never,
      pageContentCache: makePageContentCache() as never,
    });

    const health = await bus.handlers.get(IPC_AI_HEALTH_CHECK)!({
      provider: 'ollama',
      apiBase: 'http://localhost:11434',
      model: 'llama3.2',
    });
    expect(health).toEqual({ success: true, data: { ok: true, model: 'llama3.2' } });

    const save = await bus.handlers.get(IPC_AI_SET_API_KEY)!({
      provider: 'ollama',
      model: 'llama3.2',
      apiBase: 'http://localhost:11434',
    });
    expect(save).toEqual({ success: true, data: { ok: true } });
    expect(keyStore.setOllamaVerified).toHaveBeenCalledWith(true);
    expect(registry.setConfigured).toHaveBeenCalledWith('ollama', true);

    const status = await bus.handlers.get(IPC_AI_GET_API_KEY_STATUS)!({
      provider: 'ollama',
    });
    expect(status).toEqual({
      success: true,
      data: { configured: true, model: 'llama3.2', apiBase: 'http://localhost:11434' },
    });
  });
});
