import type {
  HealthCheckResult,
  ILLMService,
  LLMCapabilities,
  LLMChunk,
  LLMRequest,
  LLMResult,
} from '@/shared/interfaces/i-llm-service';

interface OllamaProviderConfig {
  apiBase?: string;
  model?: string;
}

interface OllamaChatChunk {
  message: { role: string; content: string };
  done: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

const DEFAULT_API_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1';

export class OllamaProvider implements ILLMService {
  readonly providerName = 'ollama' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 8_192,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: false,
    // No cost: local inference.
  };

  private readonly apiBase: string;
  private readonly model: string;

  constructor(config: OllamaProviderConfig = {}) {
    this.apiBase = (config.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, '');
    this.model = config.model ?? DEFAULT_MODEL;
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

    const response = await fetch(`${this.apiBase}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: true, options: { num_predict: request.maxTokens } }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed (${response.status})`);
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

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk: OllamaChatChunk;
        try { chunk = JSON.parse(line); } catch { continue; }
        if (chunk.message?.content) {
          accumulated += chunk.message.content;
          onChunk({ delta: chunk.message.content });
        }
        if (chunk.done) {
          inputTokens = chunk.prompt_eval_count ?? 0;
          outputTokens = chunk.eval_count ?? 0;
          if (chunk.done_reason === 'length') finishReason = 'max_tokens';
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
      const response = await fetch(`${this.apiBase}/api/tags`, { method: 'GET' });
      return response.ok
        ? { ok: true, model: this.model }
        : { ok: false, model: this.model, error: `HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, model: this.model, error: (err as Error).message };
    }
  }
}