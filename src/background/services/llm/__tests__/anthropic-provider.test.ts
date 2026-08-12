import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnthropicProvider } from '@/shared/llm/providers/anthropic-provider';

const ANTHROPIC_SSE_CHUNK = [
  'event: message_start\ndata: {"type":"message_start","message":{"id":"m1","usage":{"input_tokens":12,"output_tokens":0}}}\n\n',
  'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n',
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

describe('AnthropicProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('streams chunks from a Messages response', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(ANTHROPIC_SSE_CHUNK));

    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    const chunks: string[] = [];
    const result = await provider.streamChat(
      {
        systemPrompt: 'You are helpful.',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1024,
      },
      chunk => chunks.push(chunk.delta),
      new AbortController().signal,
    );

    expect(chunks.join('')).toBe('Hello world');
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(2);
  });

  it('sends correct request shape', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(ANTHROPIC_SSE_CHUNK));

    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    await provider.streamChat(
      {
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'msg' }],
        maxTokens: 256,
      },
      () => {},
      new AbortController().signal,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.max_tokens).toBe(256);
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([{ role: 'user', content: 'msg' }]);
    expect(body.stream).toBe(true);
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-test');
    expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
  });

  it('reports 200K context window for default model', () => {
    const provider = new AnthropicProvider({ apiKey: 'sk' });
    expect(provider.capabilities.contextWindow).toBe(200_000);
  });

  it('aborts the fetch when signal aborts', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });

    const provider = new AnthropicProvider({ apiKey: 'sk' });
    const promise = provider.streamChat(
      { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 100 },
      () => {},
      controller.signal,
    );

    controller.abort();
    await expect(promise).rejects.toThrow();
  });
});