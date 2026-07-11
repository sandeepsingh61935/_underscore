import { describe, expect, it, vi } from 'vitest';

import { checkProviderHealthInBrowser } from '../check-provider-health';

describe('checkProviderHealthInBrowser', () => {
  it('returns error when gemini key is missing', async () => {
    const result = await checkProviderHealthInBrowser('gemini', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('API key required');
  });

  it('returns ok when gemini health fetch succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '',
      })),
    );

    const result = await checkProviderHealthInBrowser('gemini', { apiKey: 'AIza-test' });
    expect(result).toEqual({ ok: true, model: 'gemini-2.0-flash' });
    vi.unstubAllGlobals();
  });
});
