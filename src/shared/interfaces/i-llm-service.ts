/**
 * Provider-agnostic LLM service contract.
 * All implementations (Anthropic, Ollama, future OpenAI) conform to this shape.
 */

export interface LLMCapabilities {
  /** Max tokens (input + output) the model supports. */
  contextWindow: number;
  /** Whether the provider accepts a separate system prompt. */
  supportsSystemPrompt: boolean;
  /** Whether the provider supports streaming via SSE. */
  supportsStreaming: boolean;
  /** Whether the provider supports tool/function calling. */
  supportsToolUse: boolean;
  /** USD per input token; undefined for local providers. */
  costPerInputToken?: number;
  /** USD per output token; undefined for local providers. */
  costPerOutputToken?: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  /** Plain string; full-page + marked-highlights HTML is rendered by the provider. */
  content: string;
}

export interface LLMRequest {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMChunk {
  /** Incremental text delta from the provider. */
  delta: string;
  /** Present on the final chunk of a stream. */
  finishReason?: 'stop' | 'max_tokens' | 'abort';
}

export interface LLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface HealthCheckResult {
  ok: boolean;
  model: string;
  /** Present when ok=false. */
  error?: string;
}

/** In-app chat backends only (BYOK + local). Agent hosts use MCP, not this union. */
export type ProviderName =
  | 'anthropic'
  | 'ollama'
  | 'gemini'
  | 'openai'
  | 'openrouter'
  | 'xai';

export interface ILLMService {
  readonly providerName: ProviderName;
  readonly capabilities: LLMCapabilities;

  /**
   * Stream a chat completion. Calls `onChunk` for each incremental delta.
   * Resolves when the stream ends. Throws on provider error.
   * If `signal` aborts, the underlying fetch is cancelled.
   */
  streamChat(
    request: LLMRequest,
    onChunk: (chunk: LLMChunk) => void,
    signal: AbortSignal
  ): Promise<LLMResult>;

  /** Single-shot completion for short tasks. */
  chat(request: LLMRequest): Promise<LLMResult>;

  /** Validate provider config + connectivity. */
  healthCheck(): Promise<HealthCheckResult>;
}