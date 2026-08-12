/**
 * Grounded chat domain types (ADR-028).
 */

export type ChatScopeKind = 'library' | 'domain' | 'section';

export type ChatScope =
  | { kind: 'library' }
  | { kind: 'domain'; domain: string }
  | { kind: 'section'; domain: string; sectionKey: string };

export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessageStatus = 'completed' | 'streaming' | 'failed' | 'cancelled';

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  scope: ChatScope;
  createdAt: string;
  updatedAt: string;
  lastProvider?: string;
  lastModel?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  provider?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadInput {
  userId: string;
  scope: ChatScope;
  /** Optional client id (crypto.randomUUID). Server generates if omitted. */
  id?: string;
  title?: string;
  lastProvider?: string;
  lastModel?: string;
}

export interface UpdateThreadPatch {
  title?: string;
  lastProvider?: string;
  lastModel?: string;
  /** Bump activity clock (ISO). Defaults to now on repo update. */
  updatedAt?: string;
}

export interface AppendMessageInput {
  userId: string;
  threadId: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  /** Optional client id. */
  id?: string;
  provider?: string;
  model?: string;
}

export interface FinalizeMessagePatch {
  content?: string;
  status: ChatMessageStatus;
  provider?: string;
  model?: string;
}

/** v1 quotas (ADR-028 §10). */
export const CHAT_QUOTAS = {
  threadsPerUser: 200,
  messagesPerThread: 200,
  contentCharsPerMessage: 32_000,
  /** Pairs of user/assistant turns for multi-turn context (K). */
  contextPairWindow: 10,
  titleMaxChars: 80,
} as const;

export class ChatQuotaError extends Error {
  readonly code: 'threads' | 'messages' | 'content';

  constructor(code: 'threads' | 'messages' | 'content', message: string) {
    super(message);
    this.name = 'ChatQuotaError';
    this.code = code;
  }
}
