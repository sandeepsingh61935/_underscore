/**
 * In-memory chat repository for unit tests (supports place singletons).
 */

import { scopesEqual } from './chat-scope';
import { autoTitleFromUserMessage } from './chat-title';
import type { IChatRepository } from './i-chat-repository';
import {
  CHAT_QUOTAS,
  ChatQuotaError,
  type AppendMessageInput,
  type ChatMessage,
  type ChatScope,
  type ChatThread,
  type CreateThreadInput,
  type FinalizeMessagePatch,
  type MessageWriteResult,
  type UpdateThreadPatch,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export class MemoryChatRepository implements IChatRepository {
  private threads = new Map<string, ChatThread>();
  private messages = new Map<string, ChatMessage[]>();

  async listThreads(userId: string): Promise<ChatThread[]> {
    return [...this.threads.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getThread(userId: string, threadId: string): Promise<ChatThread | null> {
    const t = this.threads.get(threadId);
    if (!t || t.userId !== userId) return null;
    return { ...t };
  }

  async findThreadByScope(
    userId: string,
    scope: ChatScope,
  ): Promise<ChatThread | null> {
    const matches = [...this.threads.values()]
      .filter((t) => t.userId === userId && scopesEqual(t.scope, scope))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return matches[0] ? { ...matches[0] } : null;
  }

  async createThread(input: CreateThreadInput): Promise<ChatThread> {
    const count = await this.countThreads(input.userId);
    if (count >= CHAT_QUOTAS.threadsPerUser) {
      throw new ChatQuotaError(
        'threads',
        `Thread limit of ${CHAT_QUOTAS.threadsPerUser} reached`,
      );
    }
    const existing = await this.findThreadByScope(input.userId, input.scope);
    if (existing && input.scope.kind !== 'library') {
      return existing;
    }
    const ts = nowIso();
    const thread: ChatThread = {
      id: input.id ?? newId(),
      userId: input.userId,
      title: input.title?.trim() || 'New chat',
      scope: input.scope,
      createdAt: ts,
      updatedAt: ts,
      lastProvider: input.lastProvider,
      lastModel: input.lastModel,
    };
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, []);
    return { ...thread };
  }

  async updateThread(
    userId: string,
    threadId: string,
    patch: UpdateThreadPatch,
  ): Promise<ChatThread> {
    const t = await this.getThread(userId, threadId);
    if (!t) throw new Error('Chat thread not found');
    if (patch.title !== undefined) t.title = patch.title;
    if (patch.lastProvider !== undefined) t.lastProvider = patch.lastProvider;
    if (patch.lastModel !== undefined) t.lastModel = patch.lastModel;
    t.updatedAt = patch.updatedAt ?? nowIso();
    this.threads.set(threadId, t);
    return { ...t };
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const t = await this.getThread(userId, threadId);
    if (!t) return;
    this.threads.delete(threadId);
    this.messages.delete(threadId);
  }

  async countThreads(userId: string): Promise<number> {
    return (await this.listThreads(userId)).length;
  }

  async listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    const t = await this.getThread(userId, threadId);
    if (!t) return [];
    return [...(this.messages.get(threadId) ?? [])];
  }

  async appendMessage(input: AppendMessageInput): Promise<MessageWriteResult> {
    if (input.content.length > CHAT_QUOTAS.contentCharsPerMessage) {
      throw new ChatQuotaError('content', 'Message too long');
    }
    const list = this.messages.get(input.threadId) ?? [];
    if (list.length >= CHAT_QUOTAS.messagesPerThread) {
      throw new ChatQuotaError('messages', 'Message limit reached');
    }
    const ts = nowIso();
    const message: ChatMessage = {
      id: input.id ?? newId(),
      threadId: input.threadId,
      userId: input.userId,
      role: input.role,
      content: input.content,
      status: input.status,
      provider: input.provider,
      model: input.model,
      createdAt: ts,
      updatedAt: ts,
    };
    list.push(message);
    this.messages.set(input.threadId, list);

    const patch: UpdateThreadPatch = { updatedAt: ts };
    if (input.role === 'user' && list.filter((m) => m.role === 'user').length <= 1) {
      patch.title = autoTitleFromUserMessage(input.content);
    }
    if (input.provider) patch.lastProvider = input.provider;
    if (input.model) patch.lastModel = input.model;
    const thread = await this.updateThread(input.userId, input.threadId, patch);
    return { message: { ...message }, thread };
  }

  async finalizeMessage(
    userId: string,
    messageId: string,
    patch: FinalizeMessagePatch,
  ): Promise<MessageWriteResult> {
    for (const [threadId, list] of this.messages) {
      const idx = list.findIndex((m) => m.id === messageId && m.userId === userId);
      if (idx < 0) continue;
      const cur = list[idx]!;
      if (cur.role !== 'assistant') throw new Error('Only assistant can finalize');
      if (cur.status !== 'streaming') {
        const thread = await this.getThread(userId, threadId);
        if (!thread) throw new Error('Chat thread not found');
        return { message: { ...cur }, thread };
      }
      const next: ChatMessage = {
        ...cur,
        status: patch.status,
        content: patch.content ?? cur.content,
        provider: patch.provider ?? cur.provider,
        model: patch.model ?? cur.model,
        updatedAt: nowIso(),
      };
      list[idx] = next;
      const thread = await this.updateThread(userId, threadId, {
        updatedAt: next.updatedAt,
        lastProvider: patch.provider,
        lastModel: patch.model,
      });
      return { message: { ...next }, thread };
    }
    throw new Error('Chat message not found');
  }

  async countMessages(userId: string, threadId: string): Promise<number> {
    return (await this.listMessages(userId, threadId)).length;
  }

  async clearMessages(userId: string, threadId: string): Promise<void> {
    const t = await this.getThread(userId, threadId);
    if (!t) return;
    this.messages.set(threadId, []);
    await this.updateThread(userId, threadId, {
      title: 'New chat',
      updatedAt: nowIso(),
    });
  }
}
