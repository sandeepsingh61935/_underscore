import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LLM_PROXY_ORIGINS,
  isAllowedLlmProxyOrigin,
  llmProxyCorsHeaders,
  resolveLlmProxyAllowedOrigins,
} from '@/shared/llm/runtime/proxy-cors';

describe('llm proxy CORS', () => {
  it('defaults include localhost and pages.dev', () => {
    const origins = resolveLlmProxyAllowedOrigins({});
    expect(origins).toEqual(expect.arrayContaining([...DEFAULT_LLM_PROXY_ORIGINS]));
  });

  it('reflects only allowlisted Origin', () => {
    const allowed = ['https://underscore-web.pages.dev'];
    expect(isAllowedLlmProxyOrigin('https://evil.example', allowed)).toBe(false);
    const req = new Request('https://underscore-web.pages.dev/api/llm/stream', {
      headers: { Origin: 'https://underscore-web.pages.dev' },
    });
    const headers = llmProxyCorsHeaders(req, allowed);
    expect(headers['access-control-allow-origin']).toBe(
      'https://underscore-web.pages.dev'
    );

    const bad = new Request('https://evil.example/', {
      headers: { Origin: 'https://evil.example' },
    });
    expect(
      llmProxyCorsHeaders(bad, allowed)['access-control-allow-origin']
    ).toBeUndefined();
  });
});
