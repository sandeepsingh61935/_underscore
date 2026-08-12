import { describe, expect, it } from 'vitest';

import {
  emptyAiPreferences,
  hasPrefsContent,
  isLocalNewer,
  isProviderPreferenceEnabled,
  parseAiPreferencesRow,
  pickLwwPrefs,
  resolveSyncedPrefs,
  touchPrefs,
  aiPreferencesToRow,
} from '@/shared/llm/ai-preferences';

describe('ai-preferences', () => {
  it('parses row and drops unknown providers', () => {
    const prefs = parseAiPreferencesRow({
      user_id: 'u1',
      default_provider: 'openai',
      models: { openai: 'gpt-4o-mini', cursor: 'nope', anthropic: '  claude  ' },
      enabled_providers: ['openai', 'cursor', 'gemini'],
      updated_at: '2026-08-12T12:00:00.000Z',
    });
    expect(prefs).toEqual({
      defaultProvider: 'openai',
      models: { openai: 'gpt-4o-mini', anthropic: 'claude' },
      enabledProviders: ['openai', 'gemini'],
      updatedAtMs: Date.parse('2026-08-12T12:00:00.000Z'),
    });
  });

  it('rejects invalid rows', () => {
    expect(parseAiPreferencesRow(null)).toBeNull();
    expect(parseAiPreferencesRow({ updated_at: 'nope' })).toBeNull();
  });

  it('LWW prefers higher updatedAtMs', () => {
    const a = { ...emptyAiPreferences(100), defaultProvider: 'openai' as const };
    const b = { ...emptyAiPreferences(200), defaultProvider: 'anthropic' as const };
    expect(isLocalNewer(a, b)).toBe(false);
    expect(isLocalNewer(b, a)).toBe(true);
    expect(pickLwwPrefs(a, b).defaultProvider).toBe('anthropic');
    expect(pickLwwPrefs(a, a, 'b')).toEqual(a);
  });

  it('local with content wins when remote missing', () => {
    const local = touchPrefs({
      ...emptyAiPreferences(),
      defaultProvider: 'ollama',
      models: { ollama: 'llama3.2' },
    });
    expect(isLocalNewer(local, null)).toBe(true);
    expect(hasPrefsContent(local)).toBe(true);
    expect(resolveSyncedPrefs(local, null).source).toBe('local');
  });

  it('empty local + remote → remote', () => {
    const remote = {
      ...emptyAiPreferences(50),
      defaultProvider: 'gemini' as const,
      models: { gemini: 'gemini-2.0-flash' },
    };
    const r = resolveSyncedPrefs(emptyAiPreferences(), remote);
    expect(r.source).toBe('remote');
    expect(r.prefs.defaultProvider).toBe('gemini');
  });

  it('enabled empty list means all enabled', () => {
    const prefs = emptyAiPreferences();
    expect(isProviderPreferenceEnabled(prefs, 'openai')).toBe(true);
    expect(
      isProviderPreferenceEnabled(
        { ...prefs, enabledProviders: ['anthropic'] },
        'openai',
      ),
    ).toBe(false);
  });

  it('row round-trip keeps clock', () => {
    const prefs = touchPrefs({
      defaultProvider: 'openrouter',
      models: { openrouter: 'meta-llama/x' },
      enabledProviders: ['openrouter'],
      updatedAtMs: 0,
    }, 1_700_000_000_000);
    const row = aiPreferencesToRow('user-1', prefs);
    expect(row.user_id).toBe('user-1');
    expect(row.default_provider).toBe('openrouter');
    expect(parseAiPreferencesRow(row)?.updatedAtMs).toBe(prefs.updatedAtMs);
  });
});
