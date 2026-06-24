import type {
  HealthCheckResult,
  ILLMService,
  LLMCapabilities,
  LLMChunk,
  LLMRequest,
  LLMResult,
} from '@/shared/interfaces/i-llm-service';

interface AnthropicProviderConfig {
  apiKey: string;
  apiBase?: string;
  model?: string;
}

interface AnthropicMessageStart {
  type: 'message_start';
  message: { usage: { input_tokens: number; output_tokens: number } };
}
interface AnthropicContentBlockDelta {
  type: 'content_block_delta';
  delta: { type: 'text_delta'; text: string };
}
interface AnthropicMessageDelta {
  type: 'message_delta';
  delta: { stop_reason: 'end_turn' | 'max_tokens' | string };
  usage: { output_tokens: number };
}
type AnthropicEvent =
  | AnthropicMessageStart
  | AnthropicContentBlockDelta
  | AnthropicMessageDelta
  | { type: string };

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_BASE = 'https://api.anthropic.com/v1';

export class AnthropicProvider implements ILLMService {
  readonly providerName = 'anthropic' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 200_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 3 / 1_000_000,
    costPerOutputToken: 15 / 1_000_000,
  };

  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly model: string;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.apiBase = config.apiBase ?? DEFAULT_BASE;
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async streamChat(
    request: LLMRequest,
    onChunk: (chunk: LLMChunk) => void,
    signal: AbortSignal,
  ): Promise<LLMResult> {
    const start = Date.now();
    const response = await fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens,
        system: request.systemPrompt,
        messages: request.messages,
        temperature: request.temperature,
        stop_sequences: request.stopSequences,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: LLMChunk['finishReason'] = 'stop';
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
        const lines = raw.split('\n');
        const dataLine = lines.find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;
        let event: AnthropicEvent;
        try { event = JSON.parse(json); } catch { continue; }
        if (event.type === 'message_start') {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === 'content_block_delta') {
          accumulated += event.delta.text;
          onChunk({ delta: event.delta.text });
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage.output_tokens;
          finishReason = event.delta.stop_reason === 'max_tokens' ? 'max_tokens' : 'stop';
        }
      }
    }

    if (signal.aborted) finishReason = 'abort';

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
      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (response.ok || response.status === 400) {
        // 400 = bad request shape, but auth worked.
        return { ok: true, model: this.model };
      }
      return { ok: false, model: this.model, error: `HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, model: this.model, error: (err as Error).message };
    }
  }
}