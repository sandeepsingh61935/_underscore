/**
 * xAI Grok — OpenAI-compatible Chat Completions at api.x.ai.
 */

import { OpenAIProvider } from './openai-provider';

import type { HealthCheckResult, ILLMService, LLMCapabilities } from '@/shared/interfaces/i-llm-service';
import { getDefaultModelId } from '@/shared/llm/provider-models';

interface XaiProviderConfig {
  apiKey: string;
  model?: string;
}

export const XAI_API_BASE = 'https://api.x.ai/v1';

export class XaiProvider implements ILLMService {
  readonly providerName = 'xai' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 131_072,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
  };

  private readonly delegate: ILLMService;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(config: XaiProviderConfig) {
    const key = config.apiKey?.trim();
    if (!key) throw new Error('xAI API key required (console.x.ai)');
    this.model = config.model ?? getDefaultModelId('xai');
    this.apiKey = key;
    this.delegate = new OpenAIProvider({
      apiKey: this.apiKey,
      apiBase: XAI_API_BASE,
      model: this.model,
    });
  }

  streamChat(
    req: Parameters<ILLMService['streamChat']>[0],
    onChunk: Parameters<ILLMService['streamChat']>[1],
    signal: AbortSignal,
  ) {
    return this.delegate.streamChat(req, onChunk, signal);
  }

  chat(req: Parameters<ILLMService['chat']>[0]) {
    return this.delegate.chat(req);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${XAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
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
