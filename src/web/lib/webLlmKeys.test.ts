import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearProviderConfig,
  commitWebLlmAction,
  extractAiPreferences,
  formatDefaultModelLabel,
  isProviderConfigured,
  readWebLlmState,
  reduceWebLlmState,
  resolveActiveProvider,
  setDefaultProvider,
  upsertProviderConfig,
  WEB_LLM_STORAGE_KEY,
  writeWebLlmState,
} from './webLlmKeys';

describe('webLlmKeys', () => {
  beforeEach(() => {
    localStorage.removeItem(WEB_LLM_STORAGE_KEY);
  });

  it('starts empty', () => {
    const s = readWebLlmState();
    expect(s.providers).toEqual({});
    expect(s.defaultProvider).toBeUndefined();
    expect(resolveActiveProvider(s)).toBeNull();
  });

  it('key without checkedAt is not configured', () => {
    writeWebLlmState({
      providers: { openai: { apiKey: 'sk-test' } },
    });
    expect(isProviderConfigured(readWebLlmState(), 'openai')).toBe(false);
  });

  it('upserts provider with checkedAt and sets default when first configured', () => {
    const next = upsertProviderConfig('openai', {
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      checkedAt: 1,
    });
    expect(isProviderConfigured(next, 'openai')).toBe(true);
    expect(next.defaultProvider).toBe('openai');
    expect(readWebLlmState().providers.openai?.apiKey).toBe('sk-test');
    expect(formatDefaultModelLabel(next)).toContain('OpenAI');
  });

  it('clears provider and reassigns default', () => {
    upsertProviderConfig('openai', { apiKey: 'sk-a', checkedAt: 1 });
    upsertProviderConfig('anthropic', { apiKey: 'sk-b', checkedAt: 2 });
    setDefaultProvider('anthropic');
    const next = clearProviderConfig('anthropic');
    expect(isProviderConfigured(next, 'anthropic')).toBe(false);
    expect(next.defaultProvider).toBe('openai');
  });

  it('reduceWebLlmState is pure', () => {
    const base = { providers: {} };
    const a = reduceWebLlmState(base, {
      type: 'upsert',
      provider: 'ollama',
      patch: { apiBase: 'http://localhost:11434', checkedAt: 9 },
    });
    expect(base.providers).toEqual({});
    expect(isProviderConfigured(a, 'ollama')).toBe(true);
  });

  it('formatDefaultModelLabel follows resolveActiveProvider when default is stale', () => {
    writeWebLlmState({
      providers: {
        openai: { apiKey: 'sk-a', checkedAt: 1, model: 'gpt-4o-mini' },
      },
      // Stale default pointing at unconfigured provider
      defaultProvider: 'anthropic',
    });
    const s = readWebLlmState();
    expect(resolveActiveProvider(s)).toBe('openai');
    expect(formatDefaultModelLabel(s)).toContain('OpenAI');
    expect(formatDefaultModelLabel(s)).not.toBe('None');
  });

  it('resolveActiveProvider uses canonical order when default unset', () => {
    writeWebLlmState({
      providers: {
        ollama: { checkedAt: 1 },
        openai: { apiKey: 'sk', checkedAt: 1 },
      },
    });
    // openai precedes ollama in IN_APP_LLM_PROVIDER_ORDER
    expect(resolveActiveProvider(readWebLlmState())).toBe('openai');
  });

  it('extractAiPreferences keeps empty enablement (does not invent from configured)', () => {
    writeWebLlmState({
      providers: {
        openai: { apiKey: 'sk', checkedAt: 1, model: 'gpt-4o-mini' },
      },
      defaultProvider: 'openai',
      prefsUpdatedAtMs: 42,
    });
    const prefs = extractAiPreferences(readWebLlmState());
    expect(prefs.enabledProviders).toEqual([]);
    expect(prefs.models).toEqual({ openai: 'gpt-4o-mini' });
    expect(prefs.updatedAtMs).toBe(42);
  });

  it('applyPrefs replaces models whole-doc and preserves secrets', () => {
    writeWebLlmState({
      providers: {
        openai: { apiKey: 'sk-a', checkedAt: 1, model: 'gpt-local' },
        anthropic: { apiKey: 'sk-b', checkedAt: 2, model: 'claude-local' },
      },
      defaultProvider: 'openai',
    });
    const next = commitWebLlmAction({
      type: 'applyPrefs',
      prefs: {
        defaultProvider: 'anthropic',
        models: { anthropic: 'claude-remote' },
        enabledProviders: [],
        updatedAtMs: 99,
      },
    });
    expect(next.providers.openai?.apiKey).toBe('sk-a');
    expect(next.providers.openai?.model).toBeUndefined();
    expect(next.providers.anthropic?.apiKey).toBe('sk-b');
    expect(next.providers.anthropic?.model).toBe('claude-remote');
    expect(next.defaultProvider).toBe('anthropic');
    expect(next.prefsUpdatedAtMs).toBe(99);
    expect(next.enabledProviders).toBeUndefined();
  });
});
