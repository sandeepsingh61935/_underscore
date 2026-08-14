/**
 * Grounded chat session + turn write path (ADR-028 §6).
 */

import type { IChatRepository } from './i-chat-repository';
import { placeToScope, type Place } from './place';
import {
  CHAT_QUOTAS,
  ChatQuotaError,
  type ChatMessage,
  type ChatScope,
  type ChatThread,
  type ChatMessageStatus,
  type MessageWriteResult,
} from './types';

export interface BeginTurnInput {
  userId: string;
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

  /**
   * Load messages and terminalize any stuck `streaming` assistants
   * (prior session crash / navigation without finalize).
   */
  async listMessagesRecovered(
    userId: string,
    threadId: string,
  ): Promise<ChatMessage[]> {
    const list = await this.repo.listMessages(userId, threadId);
    const stale = list.filter(
      (m) => m.role === 'assistant' && m.status === 'streaming',
    );
    if (stale.length === 0) return list;

    const recovered = await Promise.all(
      stale.map((m) =>
        this.repo
          .finalizeMessage(userId, m.id, {
            content: m.content,
            status: 'cancelled',
          })
          .then((r) => r.message)
          .catch((): ChatMessage => ({ ...m, status: 'cancelled' })),
      ),
    );
    const byId = new Map(recovered.map((m) => [m.id, m]));
    return list.map((m) => byId.get(m.id) ?? m);
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

    const msgCount = await this.repo.countMessages(input.userId, thread.id);
    if (msgCount + 2 > CHAT_QUOTAS.messagesPerThread) {
      throw new ChatQuotaError(
        'messages',
        `Message limit of ${CHAT_QUOTAS.messagesPerThread} per thread reached`,
      );
    }

    const userWrite = await this.repo.appendMessage({
      userId: input.userId,
      threadId: thread.id,
      role: 'user',
      content: question,
      status: 'completed',
    });
    thread = userWrite.thread;

    const assistantWrite = await this.repo.appendMessage({
      userId: input.userId,
      threadId: thread.id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider: input.provider,
      model: input.model,
    });

    return {
      thread: assistantWrite.thread,
      userMessage: userWrite.message,
      assistantMessage: assistantWrite.message,
    };
  }

  async finalizeTurn(input: FinalizeTurnInput): Promise<MessageWriteResult> {
    return this.repo.finalizeMessage(input.userId, input.assistantMessageId, {
      content: input.content,
      status: input.status,
      provider: input.provider,
      model: input.model,
    });
  }

  /**
   * Get or create the singleton thread for a place (domain | section | project).
   */
  async resolvePlaceChat(
    userId: string,
    place: Place,
    opts?: { title?: string },
  ): Promise<ChatThread> {
    const scope = placeToScope(place);
    const existing = await this.repo.findThreadByScope(userId, scope);
    if (existing) return existing;

    const title =
      opts?.title ??
      (place.type === 'domain'
        ? place.domain
        : place.type === 'section'
          ? place.sectionKey
          : 'Project');

    return this.repo.createThread({
      userId,
      scope,
      title,
    });
  }

  /** Clear transcript for a place chat (keep thread / place identity). */
  async clearConversation(userId: string, threadId: string): Promise<void> {
    await this.repo.clearMessages(userId, threadId);
  }
}
