/**
 * High-level grounded chat write path (ADR-028 §6).
 *
 * 1. Persist user message
 * 2. Create assistant stub (streaming)
 * 3. Finalize on DONE / failed / cancelled
 */

import type { IChatRepository } from './i-chat-repository';
import {
  CHAT_QUOTAS,
  ChatQuotaError,
  type ChatMessage,
  type ChatScope,
  type ChatThread,
  type ChatMessageStatus,
} from './types';

export interface BeginTurnInput {
  userId: string;
  /** Existing thread, or null to create with scope. */
  threadId: string | null;
  scope: ChatScope;
  question: string;
  provider?: string;
  model?: string;
}

export interface BeginTurnResult {
  thread: ChatThread;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface FinalizeTurnInput {
  userId: string;
  assistantMessageId: string;
  content: string;
  status: Extract<ChatMessageStatus, 'completed' | 'failed' | 'cancelled'>;
  provider?: string;
  model?: string;
}

export class ChatService {
  constructor(private readonly repo: IChatRepository) {}

  listThreads(userId: string): Promise<ChatThread[]> {
    return this.repo.listThreads(userId);
  }

  getThread(userId: string, threadId: string): Promise<ChatThread | null> {
    return this.repo.getThread(userId, threadId);
  }

  listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    return this.repo.listMessages(userId, threadId);
  }

  deleteThread(userId: string, threadId: string): Promise<void> {
    return this.repo.deleteThread(userId, threadId);
  }

  async beginTurn(input: BeginTurnInput): Promise<BeginTurnResult> {
    const question = input.question.trim();
    if (!question) throw new Error('Question is required');

    let thread: ChatThread;
    if (input.threadId) {
      const existing = await this.repo.getThread(input.userId, input.threadId);
      if (!existing) throw new Error('Chat thread not found');
      thread = existing;
    } else {
      thread = await this.repo.createThread({
        userId: input.userId,
        scope: input.scope,
        lastProvider: input.provider,
        lastModel: input.model,
      });
    }

    // Reserve user + assistant rows so we never leave a half-turn at the quota edge.
    const msgCount = await this.repo.countMessages(input.userId, thread.id);
    if (msgCount + 2 > CHAT_QUOTAS.messagesPerThread) {
      throw new ChatQuotaError(
        'messages',
        `Message limit of ${CHAT_QUOTAS.messagesPerThread} per thread reached`,
      );
    }

    const userMessage = await this.repo.appendMessage({
      userId: input.userId,
      threadId: thread.id,
      role: 'user',
      content: question,
      status: 'completed',
    });

    // Refresh thread after auto-title
    const refreshed = await this.repo.getThread(input.userId, thread.id);
    if (refreshed) thread = refreshed;

    const assistantMessage = await this.repo.appendMessage({
      userId: input.userId,
      threadId: thread.id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider: input.provider,
      model: input.model,
    });

    return { thread, userMessage, assistantMessage };
  }

  async finalizeTurn(input: FinalizeTurnInput): Promise<ChatMessage> {
    return this.repo.finalizeMessage(input.userId, input.assistantMessageId, {
      content: input.content,
      status: input.status,
      provider: input.provider,
      model: input.model,
    });
  }
}
