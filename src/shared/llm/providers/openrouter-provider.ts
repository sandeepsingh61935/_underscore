import { OpenAIProvider } from './openai-provider';

import type {
  HealthCheckResult,
  ILLMService,
  LLMCapabilities,
} from '@/shared/interfaces/i-llm-service';
import { isOpenRouterModelFree } from '@/shared/llm/openrouter-models';
import { getDefaultModelId } from '@/shared/llm/provider-models';

interface OpenRouterProviderConfig {
  /** Required for all models — free means $0 credits, not keyless auth. */
  apiKey: string;
  model?: string;
  siteUrl?: string;
  appName?: string;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const OPENROUTER_ATTRIBUTION = {
  siteUrl: 'https://underscore.app',
  appName: 'Underscore Highlighter',
};

/**
 * OpenRouter (OpenAI-compatible).
 * All chat calls need an API key (create free at openrouter.ai/keys).
 * Models tagged `:free` do not consume credits once authenticated.
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
    const key = config.apiKey?.trim();
    if (!key) {
      throw new Error(
        'OpenRouter API key required (free at openrouter.ai/keys). ' +
          'Free models do not charge credits but still need a key.'
      );
    }
    this.model = config.model ?? getDefaultModelId('openrouter');
    this.apiKey = key;
    this.extraHeaders = {
      'HTTP-Referer': config.siteUrl ?? OPENROUTER_ATTRIBUTION.siteUrl,
      'X-Title': config.appName ?? OPENROUTER_ATTRIBUTION.appName,
    };

    this.delegate = new OpenAIProvider({
      apiKey: this.apiKey,
      apiBase: OPENROUTER_BASE,
      model: this.model,
      extraHeaders: this.extraHeaders,
    });
  }

  streamChat(
    req: Parameters<ILLMService['streamChat']>[0],
    onChunk: Parameters<ILLMService['streamChat']>[1],
    signal: AbortSignal
  ) {
    return this.delegate.streamChat(req, onChunk, signal);
  }

  chat(req: Parameters<ILLMService['chat']>[0]) {
    return this.delegate.chat(req);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...this.extraHeaders,
      };
      if (this.apiKey) headers['authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers,
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

export { isOpenRouterModelFree };
