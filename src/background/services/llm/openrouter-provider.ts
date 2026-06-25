import { OpenAIProvider } from './openai-provider';
import type { HealthCheckResult, ILLMService, LLMCapabilities } from '@/shared/interfaces/i-llm-service';

interface OpenRouterProviderConfig {
  apiKey: string;
  /** e.g. 'meta-llama/llama-3.3-70b-instruct:free'. */
  model?: string;
  /** OpenRouter's recommended HTTP-Referer attribution. */
  siteUrl?: string;
  /** OpenRouter's recommended X-Title attribution. */
  appName?: string;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
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
    // Cost varies per routed model; left undefined.
  };

  private readonly delegate: ILLMService;

  constructor(config: OpenRouterProviderConfig) {
    const extraHeaders: Record<string, string> = {};
    if (config.siteUrl) extraHeaders['HTTP-Referer'] = config.siteUrl;
    if (config.appName) extraHeaders['X-Title'] = config.appName;
    this.delegate = new OpenAIProvider({
      apiKey: config.apiKey,
      apiBase: OPENROUTER_BASE,
      model: config.model ?? DEFAULT_MODEL,
      extraHeaders,
    });
  }

  streamChat(req: Parameters<ILLMService['streamChat']>[0], onChunk: Parameters<ILLMService['streamChat']>[1], signal: AbortSignal) {
    return this.delegate.streamChat(req, onChunk, signal);
  }

  chat(req: Parameters<ILLMService['chat']>[0]) {
    return this.delegate.chat(req);
  }

  healthCheck(): Promise<HealthCheckResult> {
    return this.delegate.healthCheck();
  }
}