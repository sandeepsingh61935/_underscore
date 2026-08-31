import { describe, expect, it } from 'vitest';

import { resolveCloudHealthTransport } from '@/shared/llm/health-transport';

describe('resolveCloudHealthTransport', () => {
  it('ollama is always direct', () => {
    expect(resolveCloudHealthTransport({ provider: 'ollama' })).toBe('direct');
  });

  it('cloud with token uses proxy', () => {
    expect(
      resolveCloudHealthTransport({
        provider: 'openai',
        accessToken: 'jwt',
      })
    ).toBe('proxy');
  });

  it('cloud without token is unavailable on web (default)', () => {
    expect(resolveCloudHealthTransport({ provider: 'openai' })).toBe('unavailable');
  });

  it('extension may allow direct cloud', () => {
    expect(
      resolveCloudHealthTransport({
        provider: 'anthropic',
        allowDirectCloud: true,
      })
    ).toBe('direct');
  });
});
