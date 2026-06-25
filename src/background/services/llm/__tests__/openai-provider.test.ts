import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OpenAIProvider } from '../openai-provider';

const OPENAI_SSE = [
  'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
  'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":2}}\n\n',
  'data: [DONE]\n\n',
].join('');

function makeSseResponse(body: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

describe('OpenAIProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('streams chunks and parses [DONE] sentinel', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(OPENAI_SSE));

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const chunks: string[] = [];
    const result = await provider.streamChat(
      { systemPrompt: 'sys', messages: [{ role: 'user', content: 'm' }], maxTokens: 100 },
      chunk => chunks.push(chunk.delta),
      new AbortController().signal,
    );

    expect(chunks.join('')).toBe('Hi there');
    expect(result.inputTokens).toBe(4);
    expect(result.outputTokens).toBe(2);
  });

  it('sends request shape with stream_options include_usage', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(OPENAI_SSE));

    const provider = new OpenAIProvider({ apiKey: 'sk-x' });
    await provider.streamChat(
      { systemPrompt: 'sys', messages: [{ role: 'user', content: 'msg' }], maxTokens: 64 },
      () => {},
      new AbortController().signal,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.messages).toContainEqual({ role: 'system', content: 'sys' });
    expect(body.messages).toContainEqual({ role: 'user', content: 'msg' });
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer sk-x');
  });

  it('forwards extraHeaders on requests', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(OPENAI_SSE));

    const provider = new OpenAIProvider({
      apiKey: 'sk-x',
      extraHeaders: { 'HTTP-Referer': 'https://example.com' },
    });
    await provider.streamChat(
      { systemPrompt: 'sys', messages: [{ role: 'user', content: 'm' }], maxTokens: 64 },
      () => {},
      new AbortController().signal,
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['HTTP-Referer']).toBe('https://example.com');
  });
});