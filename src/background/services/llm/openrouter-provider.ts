import { OpenAIProvider } from './openai-provider';
import type { HealthCheckResult, ILLMService, LLMCapabilities } from '@/shared/interfaces/i-llm-service';
import { getDefaultModelId } from '@/shared/llm/provider-models';

interface OpenRouterProviderConfig {
  apiKey: string;
  /** e.g. 'meta-llama/llama-3.3-70b-instruct:free'. */
  model?: string;
  /** OpenRouter's recommended HTTP-Referer attribution. */
  siteUrl?: string;
  /** OpenRouter's recommended X-Title attribution. */
  appName?: string;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter (OpenAI-compatible). Routes requests to many upstream providers
 * via a single API key + base URL. Sends the recommended HTTP-Referer and
 * X-Title attribution headers.
 */
export class OpenRouterProvider implements ILLMService {
  readonly providerName = 'openrouter' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 128_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
  };

  private readonly delegate: ILLMService;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(config: OpenRouterProviderConfig) {
    this.model = config.model ?? getDefaultModelId('openrouter');
    this.apiKey = config.apiKey;
    this.extraHeaders = {};
    if (config.siteUrl) this.extraHeaders['HTTP-Referer'] = config.siteUrl;
    if (config.appName) this.extraHeaders['X-Title'] = config.appName;

    this.delegate = new OpenAIProvider({
      apiKey: config.apiKey,
      apiBase: OPENROUTER_BASE,
      model: this.model,
      extraHeaders: this.extraHeaders,
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
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
          ...this.extraHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
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
