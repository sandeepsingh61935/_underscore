import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GeminiProvider } from '@/shared/llm/providers/gemini-provider';

const GEMINI_SSE = [
  'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}],"usageMetadata":{"promptTokenCount":7,"candidatesTokenCount":0}}\n\n',
  'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}],"usageMetadata":{"promptTokenCount":7,"candidatesTokenCount":2}}\n\n',
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
    { headers: { 'content-type': 'text/event-stream' } }
  );
}

describe('GeminiProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('streams chunks from a Gemini response', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(GEMINI_SSE));

    const provider = new GeminiProvider({ apiKey: 'AIza-test' });
    const chunks: string[] = [];
    const result = await provider.streamChat(
      {
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 256,
      },
      (chunk) => chunks.push(chunk.delta),
      new AbortController().signal
    );

    expect(chunks.join('')).toBe('Hello world');
    expect(result.inputTokens).toBe(7);
    expect(result.outputTokens).toBe(2);
  });

  it('sends request to streamGenerateContent with key query', async () => {
    fetchMock.mockResolvedValueOnce(makeSseResponse(GEMINI_SSE));

    const provider = new GeminiProvider({ apiKey: 'AIza-key' });
    await provider.streamChat(
      { systemPrompt: 'sys', messages: [{ role: 'user', content: 'm' }], maxTokens: 128 },
      () => {},
      new AbortController().signal
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('streamGenerateContent?alt=sse&key=AIza-key');
    expect(url).toContain('gemini-2.0-flash');
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.maxOutputTokens).toBe(128);
    expect(body.systemInstruction.parts[0].text).toBe('sys');
    expect(body.contents[0].role).toBe('user');
  });

  it('reports 1M context window for default model', () => {
    const provider = new GeminiProvider({ apiKey: 'k' });
    expect(provider.capabilities.contextWindow).toBe(1_000_000);
  });
});
