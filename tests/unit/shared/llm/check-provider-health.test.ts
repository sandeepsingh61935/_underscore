import { describe, it, expect, vi, beforeEach } from 'vitest';

import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';

describe('checkProviderHealthInBrowser — ollama', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fails with a pull hint when the selected model is not installed', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3.2' }, { name: 'qwen2.5-coder:7b' }],
      }),
    } as Response);

    const result = await checkProviderHealthInBrowser('ollama', {
      model: 'mistral:latest',
    });

    expect(result).toEqual({
      ok: false,
      model: 'mistral:latest',
      error: 'Model not installed — run ollama pull mistral:latest',
    });
  });

  it('succeeds when the selected model is present in /api/tags', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    } as Response);

    const result = await checkProviderHealthInBrowser('ollama', { model: 'llama3.2' });

    expect(result).toEqual({ ok: true, model: 'llama3.2' });
  });

  it('fails when no models are installed at all', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    } as Response);

    const result = await checkProviderHealthInBrowser('ollama', { model: 'llama3.2' });

    expect(result).toEqual({
      ok: false,
      model: 'llama3.2',
      error: 'No models installed — run ollama pull <model>',
    });
  });

  it('fails when the endpoint is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('fetch failed'));

    const result = await checkProviderHealthInBrowser('ollama', { model: 'llama3.2' });

    expect(result).toEqual({ ok: false, model: 'llama3.2', error: 'fetch failed' });
  });
});
