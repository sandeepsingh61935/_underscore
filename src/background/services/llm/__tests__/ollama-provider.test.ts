import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OllamaProvider } from '../ollama-provider';

const OLLAMA_NDJSON = [
  '{"model":"llama3.1","created_at":"2026-06-24T00:00:00Z","message":{"role":"assistant","content":"Hello"},"done":false}\n',
  '{"model":"llama3.1","created_at":"2026-06-24T00:00:01Z","message":{"role":"assistant","content":" world"},"done":false}\n',
  '{"model":"llama3.1","created_at":"2026-06-24T00:00:02Z","message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":10,"eval_count":2}\n',
].join('');

function makeNdjsonResponse(body: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    { headers: { 'content-type': 'application/x-ndjson' } },
  );
}

describe('OllamaProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('streams NDJSON chunks', async () => {
    fetchMock.mockResolvedValueOnce(makeNdjsonResponse(OLLAMA_NDJSON));

    const provider = new OllamaProvider({ apiBase: 'http://localhost:11434' });
    const chunks: string[] = [];
    const result = await provider.streamChat(
      { systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }], maxTokens: 100 },
      chunk => chunks.push(chunk.delta),
      new AbortController().signal,
    );

    expect(chunks.join('')).toBe('Hello world');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(2);
  });

  it('sends correct request shape to /api/chat', async () => {
    fetchMock.mockResolvedValueOnce(makeNdjsonResponse(OLLAMA_NDJSON));

    const provider = new OllamaProvider({ apiBase: 'http://localhost:11434', model: 'mistral' });
    await provider.streamChat(
      { systemPrompt: 'sys', messages: [{ role: 'user', content: 'msg' }], maxTokens: 256 },
      () => {},
      new AbortController().signal,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('mistral');
    expect(body.messages).toContainEqual({ role: 'user', content: 'msg' });
    expect(body.stream).toBe(true);
  });

  it('reports 8K context window for default model', () => {
    const provider = new OllamaProvider({ apiBase: 'http://x' });
    expect(provider.capabilities.contextWindow).toBe(8_192);
  });
});