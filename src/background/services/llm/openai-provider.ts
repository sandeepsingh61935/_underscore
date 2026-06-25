import type {
  HealthCheckResult,
  ILLMService,
  LLMCapabilities,
  LLMChunk,
  LLMRequest,
  LLMResult,
} from '@/shared/interfaces/i-llm-service';

interface OpenAIProviderConfig {
  apiKey: string;
  apiBase?: string;
  model?: string;
  /** Extra HTTP headers (e.g. OpenRouter's HTTP-Referer / X-Title). */
  extraHeaders?: Record<string, string>;
}

interface OpenAIChunk {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: 'stop' | 'length' | string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE = 'https://api.openai.com/v1';

/**
 * OpenAI Chat Completions (SSE with `data: [DONE]` sentinel).
 * Also serves as the OpenAI-compatible adapter shape for OpenRouter,
 * MiniMax, and other vendors that follow the same schema.
 */
export class OpenAIProvider implements ILLMService {
  readonly providerName = 'openai' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 128_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 0.15 / 1_000_000,
    costPerOutputToken: 0.60 / 1_000_000,
  };

  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly model: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.apiBase = (config.apiBase ?? DEFAULT_BASE).replace(/\/$/, '');
    this.model = config.model ?? DEFAULT_MODEL;
    this.extraHeaders = config.extraHeaders ?? {};
  }

  async streamChat(
    request: LLMRequest,
    onChunk: (chunk: LLMChunk) => void,
    signal: AbortSignal,
  ): Promise<LLMResult> {
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push(...request.messages.map(m => ({ role: m.role, content: m.content })));

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stop: request.stopSequences,
        stream: true,
        stream_options: { include_usage: true },
        messages,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let accumulated = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const raw of events) {
        const dataLine = raw.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        let parsed: OpenAIChunk;
        try { parsed = JSON.parse(json); } catch { continue; }
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) {
          accumulated += text;
          onChunk({ delta: text });
        }
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
          outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        }
      }
    }

    return { text: accumulated, inputTokens, outputTokens, durationMs: Date.now() - start };
  }

  async chat(request: LLMRequest): Promise<LLMResult> {
    const controller = new AbortController();
    let accumulated = '';
    const result = await this.streamChat(
      request,
      chunk => { accumulated += chunk.delta; },
      controller.signal,
    );
    return { ...result, text: accumulated };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.apiBase}/models/${this.model}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${this.apiKey}`, ...this.extraHeaders },
      });
      return response.ok
        ? { ok: true, model: this.model }
        : { ok: false, model: this.model, error: `HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, model: this.model, error: (err as Error).message };
    }
  }
}