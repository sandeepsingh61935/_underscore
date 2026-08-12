import { describe, expect, it, vi } from 'vitest';

import { checkProviderHealthInBrowser } from '../check-provider-health';

describe('checkProviderHealthInBrowser', () => {
  it('cloud without token is unavailable on web (no silent direct)', async () => {
    const result = await checkProviderHealthInBrowser('gemini', {});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/sign in/i);
  });

  it('returns error when gemini key is missing (extension direct)', async () => {
    const result = await checkProviderHealthInBrowser('gemini', {
      allowDirectCloud: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/API key/i);
  });

  it('returns ok when gemini health fetch succeeds (extension direct)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '',
      })),
    );

    const result = await checkProviderHealthInBrowser('gemini', {
      apiKey: 'AIza-test',
      allowDirectCloud: true,
    });
    expect(result).toEqual({ ok: true, model: 'gemini-2.0-flash' });
    vi.unstubAllGlobals();
  });
});
