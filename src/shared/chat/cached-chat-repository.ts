/**
 * Cloud SoT + local cache hydrate/write-through (ADR-028 §3).
 */

import type { IChatCache } from './indexeddb-chat-cache';
import type { IChatRepository } from './i-chat-repository';
import type {
  AppendMessageInput,
  ChatMessage,
  ChatThread,
  CreateThreadInput,
  FinalizeMessagePatch,
  MessageWriteResult,
  UpdateThreadPatch,
} from './types';

export class CachedChatRepository implements IChatRepository {
  constructor(
    private readonly remote: IChatRepository,
    private readonly cache: IChatCache,
  ) {}

  async listThreads(userId: string): Promise<ChatThread[]> {
    try {
      const threads = await this.remote.listThreads(userId);
      await this.cache.putThreads(userId, threads);
      return threads;
    } catch (err) {
      const cached = await this.cache.listThreads(userId);
      if (cached.length > 0) return cached;
      throw err;
    }
  }

  async getThread(userId: string, threadId: string): Promise<ChatThread | null> {
    try {
      const thread = await this.remote.getThread(userId, threadId);
      if (thread) await this.cache.putThread(thread);
      return thread;
    } catch (err) {
      const all = await this.cache.listThreads(userId);
      const hit = all.find((t) => t.id === threadId) ?? null;
      if (hit) return hit;
      throw err;
    }
  }

  async createThread(input: CreateThreadInput): Promise<ChatThread> {
    const thread = await this.remote.createThread(input);
    await this.cache.putThread(thread);
    return thread;
  }

  async updateThread(
    userId: string,
    threadId: string,
    patch: UpdateThreadPatch,
  ): Promise<ChatThread> {
    const thread = await this.remote.updateThread(userId, threadId, patch);
    await this.cache.putThread(thread);
    return thread;
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    await this.remote.deleteThread(userId, threadId);
    await this.cache.deleteThread(userId, threadId);
  }

  async countThreads(userId: string): Promise<number> {
    return this.remote.countThreads(userId);
  }

  async listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    try {
      const messages = await this.remote.listMessages(userId, threadId);
      await this.cache.putMessages(userId, threadId, messages);
      return messages;
    } catch (err) {
      const cached = await this.cache.listMessages(userId, threadId);
      if (cached.length > 0) return cached;
      throw err;
    }
  }

  async appendMessage(input: AppendMessageInput): Promise<MessageWriteResult> {
    const result = await this.remote.appendMessage(input);
    await this.cache.putMessage(result.message);
    await this.cache.putThread(result.thread);
    return result;
  }

  async finalizeMessage(
    userId: string,
    messageId: string,
    patch: FinalizeMessagePatch,
  ): Promise<MessageWriteResult> {
    const result = await this.remote.finalizeMessage(userId, messageId, patch);
    await this.cache.putMessage(result.message);
    await this.cache.putThread(result.thread);
    return result;
  }

  async countMessages(userId: string, threadId: string): Promise<number> {
    return this.remote.countMessages(userId, threadId);
  }
}
