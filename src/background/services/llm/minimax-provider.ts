import { OpenAIProvider } from './openai-provider';
import type { ILLMService, LLMCapabilities } from '@/shared/interfaces/i-llm-service';

interface MiniMaxProviderConfig {
  apiKey: string;
  /** MiniMax model id. */
  model?: string;
  /** Optional MiniMax API base (for users running a proxy). */
  apiBase?: string;
}

const DEFAULT_MODEL = 'MiniMax-Text-01';
const DEFAULT_BASE = 'https://api.minimax.chat/v1';

/**
 * MiniMax (OpenAI-compatible). Hosts the MiniMax family of models.
 */
export class MiniMaxProvider implements ILLMService {
  readonly providerName = 'minimax' as const;
  readonly capabilities: LLMCapabilities = {
    contextWindow: 128_000,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 1 / 1_000_000,
    costPerOutputToken: 8 / 1_000_000,
  };

  private readonly delegate: ILLMService;

  constructor(config: MiniMaxProviderConfig) {
    this.delegate = new OpenAIProvider({
      apiKey: config.apiKey,
      apiBase: config.apiBase ?? DEFAULT_BASE,
      model: config.model ?? DEFAULT_MODEL,
    });
  }

  streamChat(req: Parameters<ILLMService['streamChat']>[0], onChunk: Parameters<ILLMService['streamChat']>[1], signal: AbortSignal) {
    return this.delegate.streamChat(req, onChunk, signal);
  }

  chat(req: Parameters<ILLMService['chat']>[0]) {
    return this.delegate.chat(req);
  }

  healthCheck() {
    return this.delegate.healthCheck();
  }
}