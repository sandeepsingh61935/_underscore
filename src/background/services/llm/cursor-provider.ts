import { OpenAIProvider } from './openai-provider';
import type { HealthCheckResult, ILLMService, LLMCapabilities } from '@/shared/interfaces/i-llm-service';
import { getDefaultModelId } from '@/shared/llm/provider-models';

interface CursorProviderConfig {
  apiKey: string;
  model?: string;
}

const CURSOR_BASE = 'https://api.cursor.com/v1';

/**
 * Cursor Cloud API (OpenAI-compatible chat where available).
 * Model catalog comes from GET /v1/models.
 */
export class CursorProvider implements ILLMService {
  readonly providerName = 'cursor' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 128_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: false,
  };

  private readonly delegate: ILLMService;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(config: CursorProviderConfig) {
    this.model = config.model ?? getDefaultModelId('cursor');
    this.apiKey = config.apiKey;
    this.delegate = new OpenAIProvider({
      apiKey: config.apiKey,
      apiBase: CURSOR_BASE,
      model: this.model,
    });
  }

  streamChat(req: Parameters<ILLMService['streamChat']>[0], onChunk: Parameters<ILLMService['streamChat']>[1], signal: AbortSignal) {
    return this.delegate.streamChat(req, onChunk, signal);
  }

  chat(req: Parameters<ILLMService['chat']>[0]) {
    return this.delegate.chat(req);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${CURSOR_BASE}/models`, {
        headers: { authorization: `Basic ${btoa(`${this.apiKey}:`)}` },
      });
      if (response.ok) return { ok: true, model: this.model };
      const errorText = await response.text().catch(() => '');
      const detail = errorText ? `: ${errorText.slice(0, 200)}` : '';
      return { ok: false, model: this.model, error: `HTTP ${response.status}${detail}` };
    } catch (err) {
      return { ok: false, model: this.model, error: (err as Error).message };
    }
  }
}
