/**
 * Service-worker environment: no `window` global.
 * Reproduces Gemini API key save + health check without DOM APIs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerAiHandlers } from '../ipc-handlers';
import { LLMKeyStore } from '../llm-key-store';

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

function makeRegistry() {
  return {
    get: () => {
      throw new Error('not registered');
    },
    list: () => [],
    setConfigured: vi.fn(),
  };
}

describe('Gemini health check (no window)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // @ts-expect-error simulate service worker
    delete globalThis.window;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses chrome.storage.local when session storage is unavailable', async () => {
    const localStore: Record<string, string> = {};
    vi.stubGlobal('chrome', {
      storage: {
        session: undefined,
        local: {
          get: vi.fn(async (key: string) => ({ [key]: localStore[key] })),
          set: vi.fn(async (obj: Record<string, string>) => {
            Object.assign(localStore, obj);
          }),
        },
      },
    });

    const bus = makeMessageBus();
    const keyStore = new LLMKeyStore('basic');
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry() as never,
      keyStore,
      pageContentCache: { getByUrl: () => null, set: vi.fn(), deleteTab: vi.fn() } as never,
    });

    const setResult = await bus.handlers.get('IPC_AI_SET_API_KEY')!({
      provider: 'gemini',
      key: 'AIza-test-key',
    });
    expect(setResult).toEqual({ success: true, data: { ok: true } });
    expect(localStore['llm.gemini.key']).toBe('AIza-test-key');
  });

  it('falls back to local storage when session writes fail in browser context', async () => {
    const localStore: Record<string, string> = {};
    // Browser context: window exists so session is attempted first.
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(),
          set: vi.fn(async () => {
            throw new ReferenceError('window is not defined');
          }),
          remove: vi.fn(),
        },
        local: {
          get: vi.fn(async (key: string) => ({ [key]: localStore[key] })),
          set: vi.fn(async (obj: Record<string, string>) => {
            Object.assign(localStore, obj);
          }),
          remove: vi.fn(async (key: string) => {
            delete localStore[key];
          }),
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({}),
        body: null,
      })),
    );

    const bus = makeMessageBus();
    const keyStore = new LLMKeyStore('basic');
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry() as never,
      keyStore,
      pageContentCache: { getByUrl: () => null, set: vi.fn(), deleteTab: vi.fn() } as never,
    });

    const setResult = await bus.handlers.get('IPC_AI_SET_API_KEY')!({
      provider: 'gemini',
      key: 'AIza-test-key',
    });
    expect(setResult).toEqual({ success: true, data: { ok: true } });
    expect(localStore['llm.gemini.key']).toBe('AIza-test-key');

    const healthResult = await bus.handlers.get('IPC_AI_HEALTH_CHECK')!({
      provider: 'gemini',
    });
    expect(healthResult).toEqual({
      success: true,
      data: { ok: true, model: 'gemini-2.0-flash' },
    });
  });

  it('IPC_AI_SET_API_KEY + IPC_AI_HEALTH_CHECK succeed without window', async () => {
    const localStore: Record<string, string> = {};
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn(),
        },
        local: {
          get: vi.fn(async (key: string) => ({ [key]: localStore[key] })),
          set: vi.fn(async (obj: Record<string, string>) => {
            Object.assign(localStore, obj);
          }),
          remove: vi.fn(async (key: string) => {
            delete localStore[key];
          }),
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({}),
        body: null,
      })),
    );

    const bus = makeMessageBus();
    const keyStore = new LLMKeyStore('basic');
    registerAiHandlers({
      bus: bus as never,
      registry: makeRegistry() as never,
      keyStore,
      pageContentCache: { getByUrl: () => null, set: vi.fn(), deleteTab: vi.fn() } as never,
    });

    const setResult = await bus.handlers.get('IPC_AI_SET_API_KEY')!({
      provider: 'gemini',
      key: 'AIza-test-key',
    });
    expect(setResult).toEqual({ success: true, data: { ok: true } });
    expect(localStore['llm.gemini.key']).toBe('AIza-test-key');

    const healthResult = await bus.handlers.get('IPC_AI_HEALTH_CHECK')!({
      provider: 'gemini',
    });
    expect(healthResult).toEqual({
      success: true,
      data: { ok: true, model: 'gemini-2.0-flash' },
    });
  });
});
