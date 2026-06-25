import type {
  HealthCheckResult,
  ILLMService,
  LLMCapabilities,
  LLMChunk,
  LLMRequest,
  LLMResult,
} from '@/shared/interfaces/i-llm-service';

interface GeminiProviderConfig {
  apiKey: string;
  apiBase?: string;
  model?: string;
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: 'STOP' | 'MAX_TOKENS' | string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Google Gemini (gemini-2.0-flash default). Uses the
 * streamGenerateContent?alt=sse endpoint with API key in query.
 */
export class GeminiProvider implements ILLMService {
  readonly providerName = 'gemini' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 1_000_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 0.10 / 1_000_000,
    costPerOutputToken: 0.40 / 1_000_000,
  };

  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly model: string;

  constructor(config: GeminiProviderConfig) {
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
    const contents = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const body = {
      contents,
      systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : undefined,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature,
        stopSequences: request.stopSequences,
      },
    };

    const url = `${this.apiBase}/models/${this.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
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
        if (!json) continue;
        let parsed: GeminiResponse;
        try { parsed = JSON.parse(json); } catch { continue; }
        const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('');
        if (text) {
          accumulated += text;
          onChunk({ delta: text });
        }
        if (parsed.usageMetadata) {
          inputTokens = parsed.usageMetadata.promptTokenCount ?? inputTokens;
          outputTokens = parsed.usageMetadata.candidatesTokenCount ?? outputTokens;
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
      const url = `${this.apiBase}/models/${this.model}?key=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(url, { method: 'GET' });
      return response.ok
        ? { ok: true, model: this.model }
        : { ok: false, model: this.model, error: `HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, model: this.model, error: (err as Error).message };
    }
  }
}