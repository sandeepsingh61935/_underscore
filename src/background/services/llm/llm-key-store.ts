/**
 * API key store — plain strings in chrome.storage.local (extension sandbox).
 */

import type { ModeName } from '@/content/modes/mode-constants';
import { resolveProviderModel } from '@/shared/llm/provider-models';

type ProviderName = import('@/shared/interfaces/i-llm-service').ProviderName;

const ACTIVE_PROVIDER_KEY = 'llm.activeProvider';
const OLLAMA_API_BASE_KEY = 'llm.ollama.apiBase';
const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';

function keyStorageKey(provider: ProviderName): string {
  return `llm.${provider}.key`;
}

function modelStorageKey(provider: ProviderName): string {
  return `llm.${provider}.model`;
}

export class LLMKeyStore {
  constructor(_mode: ModeName) {}

  async get(provider: ProviderName): Promise<string | null> {
    const r = await chrome.storage.local.get(keyStorageKey(provider));
    return (r[keyStorageKey(provider)] as string | undefined) ?? null;
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    await chrome.storage.local.set({ [keyStorageKey(provider)]: key });
  }

  async clear(provider: ProviderName): Promise<void> {
    await chrome.storage.local.remove(keyStorageKey(provider));
  }

  async getModel(provider: ProviderName): Promise<string> {
    const r = await chrome.storage.local.get(modelStorageKey(provider));
    const stored = r[modelStorageKey(provider)] as string | undefined;
    return resolveProviderModel(provider, stored);
  }

  async setModel(provider: ProviderName, model: string): Promise<void> {
    const trimmed = model.trim();
    if (!trimmed) throw new Error('LLMKeyStore: model id cannot be empty');
    await chrome.storage.local.set({ [modelStorageKey(provider)]: trimmed });
  }

  async getActiveProvider(): Promise<ProviderName | null> {
    const r = await chrome.storage.local.get(ACTIVE_PROVIDER_KEY);
    const stored = r[ACTIVE_PROVIDER_KEY] as ProviderName | undefined;
    return stored ?? null;
  }

  async setActiveProvider(provider: ProviderName): Promise<void> {
    await chrome.storage.local.set({ [ACTIVE_PROVIDER_KEY]: provider });
  }

  async getApiBase(provider: 'ollama'): Promise<string> {
    if (provider !== 'ollama') return DEFAULT_OLLAMA_BASE;
    const r = await chrome.storage.local.get(OLLAMA_API_BASE_KEY);
    const stored = r[OLLAMA_API_BASE_KEY] as string | undefined;
    return stored?.trim() || DEFAULT_OLLAMA_BASE;
  }

  async setApiBase(_provider: 'ollama', apiBase: string): Promise<void> {
    const trimmed = apiBase.trim();
    if (!trimmed) throw new Error('LLMKeyStore: apiBase cannot be empty');
    await chrome.storage.local.set({ [OLLAMA_API_BASE_KEY]: trimmed.replace(/\/$/, '') });
  }
}
