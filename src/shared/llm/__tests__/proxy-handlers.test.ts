import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  })),
}));

vi.mock('@/shared/llm/providers/build-provider-from-config', () => ({
  buildProviderFromConfig: vi.fn(() => ({
    providerName: 'openai' as const,
    capabilities: {
      contextWindow: 1,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsToolUse: false,
    },
    streamChat: async (
      _req: unknown,
      onChunk: (c: { delta: string }) => void,
    ) => {
      onChunk({ delta: 'hi' });
      return { text: 'hi', inputTokens: 1, outputTokens: 1, durationMs: 1 };
    },
    chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
    healthCheck: async () => ({ ok: true, model: 'gpt-4o-mini' }),
  })),
}));

import {
  handleLlmHealthProxy,
  handleLlmStreamProxy,
  resetLlmProxyRateLimitsForTests,
} from '@/shared/llm/runtime/proxy-handlers';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  LLM_PROXY_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
};

function paidUser(): void {
  getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
  maybeSingle.mockResolvedValue({
    data: {
      user_id: 'user-1',
      plan: 'paid',
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
      provider: 'polar',
      provider_customer_id: 'cus_1',
    },
    error: null,
  });
}

function freeUser(): void {
  getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
  maybeSingle.mockResolvedValue({
    data: {
      user_id: 'user-1',
      plan: 'free',
      status: 'none',
      current_period_end: null,
      cancel_at_period_end: false,
      provider: null,
      provider_customer_id: null,
    },
    error: null,
  });
}

describe('handleLlmStreamProxy / health', () => {
  beforeEach(() => {
    resetLlmProxyRateLimitsForTests();
    getUser.mockReset();
    maybeSingle.mockReset();
  });

  it('401 without authorization', async () => {
    const res = await handleLlmStreamProxy(
      new Request('http://127.0.0.1:3000/api/llm/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('403 when entitlement is free', async () => {
    freeUser();
    const res = await handleLlmStreamProxy(
      new Request('http://127.0.0.1:3000/api/llm/stream', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer tok',
          'x-llm-api-key': 'sk-test',
        },
        body: JSON.stringify({
          provider: 'openai',
          request: {
            systemPrompt: 's',
            messages: [{ role: 'user', content: 'q' }],
            maxTokens: 10,
          },
        }),
      }),
      env,
    );
    expect(res.status).toBe(403);
  });

  it('400 on invalid request payload', async () => {
    paidUser();
    const res = await handleLlmStreamProxy(
      new Request('http://127.0.0.1:3000/api/llm/stream', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer tok',
          'x-llm-api-key': 'sk-test',
        },
        body: JSON.stringify({
          provider: 'openai',
          request: { systemPrompt: 's', messages: [], maxTokens: 1 },
        }),
      }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid request/i);
  });

  it('streams SSE chunk+done for paid user', async () => {
    paidUser();
    const res = await handleLlmStreamProxy(
      new Request('http://127.0.0.1:3000/api/llm/stream', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer tok',
          'x-llm-api-key': 'sk-test',
          origin: 'http://127.0.0.1:3000',
        },
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4o-mini',
          request: {
            systemPrompt: 's',
            messages: [{ role: 'user', content: 'q' }],
            maxTokens: 10,
          },
        }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://127.0.0.1:3000',
    );
    const text = await res.text();
    expect(text).toContain('event: chunk');
    expect(text).toContain('"delta":"hi"');
    expect(text).toContain('event: done');
  });

  it('health returns ok for paid user', async () => {
    paidUser();
    const res = await handleLlmHealthProxy(
      new Request('http://127.0.0.1:3000/api/llm/health', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer tok',
          'x-llm-api-key': 'sk-test',
        },
        body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini' }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; model: string };
    expect(body).toEqual({ ok: true, model: 'gpt-4o-mini' });
  });
});
