import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMKeyStore } from '@/background/services/llm/llm-key-store';

const storage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (keys === null) return { ...storage };
        const list = Array.isArray(keys) ? keys : [keys];
        const out: Record<string, unknown> = {};
        for (const key of list) {
          if (key in storage) out[key] = storage[key];
        }
        return out;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const key of list) delete storage[key];
      }),
    },
  },
});

describe('LLMKeyStore', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key];
  });

  it('stores and retrieves API keys as plain strings in chrome.storage.local', async () => {
    const store = new LLMKeyStore('pro');
    await store.set('anthropic', 'sk-test-key');
    expect(await store.get('anthropic')).toBe('sk-test-key');
  });

  it('basic tier uses the same plain local storage pattern', async () => {
    const store = new LLMKeyStore('basic');
    await store.set('openai', 'sk-basic');
    expect(await store.get('openai')).toBe('sk-basic');
  });
});
