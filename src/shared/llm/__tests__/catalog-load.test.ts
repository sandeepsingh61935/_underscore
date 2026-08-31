import { describe, it, expect, vi } from 'vitest';

import { loadInAppCatalog, presentCatalog, type LoadCatalogDeps } from '../catalog-load';
import { getProviderModels } from '../provider-models';

const snapshot = getProviderModels('openai');

describe('presentCatalog', () => {
  it('uses the snapshot when discovery has not run', () => {
    expect(presentCatalog('openai', { status: 'unknown' })).toEqual({
      models: snapshot,
      error: null,
      source: 'snapshot',
    });
  });

  it('keeps a non-empty live list', () => {
    const live = [{ id: 'gpt-live', label: 'Live GPT' }];
    expect(presentCatalog('openai', { status: 'live', models: live })).toEqual({
      models: live,
      error: null,
      source: 'live',
    });
  });

  it('treats a known-empty live list as empty, not a snapshot', () => {
    expect(
      presentCatalog('openai', { status: 'empty', error: 'none installed' })
    ).toEqual({
      models: [],
      error: 'none installed',
      source: 'empty',
    });
  });

  it('OpenRouter empty/fail falls back to the snapshot', () => {
    expect(presentCatalog('openrouter', { status: 'empty' }).source).toBe('snapshot');
    expect(presentCatalog('openrouter', { status: 'live', models: [] }).models).toEqual(
      getProviderModels('openrouter')
    );
  });
});

function deps(partial: Partial<LoadCatalogDeps> = {}): LoadCatalogDeps {
  return {
    fetchLive: vi.fn(async () => ({ models: [] })),
    ...partial,
  };
}

describe('loadInAppCatalog', () => {
  it('returns the snapshot for a cloud provider with no key', async () => {
    const presented = await loadInAppCatalog({ provider: 'openai' }, deps());
    expect(presented).toEqual({ models: snapshot, error: null, source: 'snapshot' });
  });

  it('returns live cloud models when fetch succeeds', async () => {
    const live = [{ id: 'gpt-live', label: 'Live' }];
    const presented = await loadInAppCatalog(
      { provider: 'openai', apiKey: 'sk' },
      deps({ fetchLive: async () => ({ models: live }) })
    );
    expect(presented).toEqual({ models: live, error: null, source: 'live' });
  });

  it('Ollama IPC product error stays empty (does not invent installed models)', async () => {
    const presented = await loadInAppCatalog(
      { provider: 'ollama' },
      deps({
        listViaIpc: async () => ({
          ok: false,
          reason: 'error',
          message: 'No models installed — run ollama pull <model>',
        }),
      })
    );
    expect(presented).toEqual({
      models: [],
      error: 'No models installed — run ollama pull <model>',
      source: 'empty',
    });
  });

  it('Ollama without IPC uses fetch; connection failure shows snapshot', async () => {
    const presented = await loadInAppCatalog(
      { provider: 'ollama', apiBase: 'http://localhost:11434' },
      deps({ fetchLive: async () => ({ models: [], error: 'fetch failed' }) })
    );
    expect(presented.source).toBe('snapshot');
    expect(presented.models).toEqual(getProviderModels('ollama'));
    expect(presented.error).toBe('fetch failed');
  });

  it('classifies missing IPC as unavailable, not by sniffing error text', async () => {
    const presented = await loadInAppCatalog(
      { provider: 'ollama' },
      deps({
        listViaIpc: async () => ({
          ok: false,
          reason: 'unavailable',
          message: 'runtime down',
        }),
        fetchLive: async () => ({ models: [], error: 'offline' }),
      })
    );
    expect(presented.source).toBe('snapshot');
    expect(presented.error).toBe('offline');
  });
});
