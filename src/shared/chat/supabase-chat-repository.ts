/**
 * Supabase source-of-truth for grounded chat (ADR-028).
 * Repository only — no raw client in UI components.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  CHAT_MESSAGES_TABLE,
  CHAT_THREADS_TABLE,
  type IChatRepository,
} from './i-chat-repository';
import {
  messageFromRow,
  messageToInsertRow,
  threadFromRow,
  threadToInsertRow,
  type ChatMessageRow,
  type ChatThreadRow,
} from './row-mappers';
import { autoTitleFromUserMessage } from './chat-title';
import {
  CHAT_QUOTAS,
  ChatQuotaError,
  type AppendMessageInput,
  type ChatMessage,
  type ChatThread,
  type CreateThreadInput,
  type FinalizeMessagePatch,
  type MessageWriteResult,
  type UpdateThreadPatch,
} from './types';

const THREAD_SELECT =
  'id, user_id, title, scope_kind, domain, section_key, last_provider, last_model, created_at, updated_at';

const MESSAGE_SELECT =
  'id, thread_id, user_id, role, content, status, provider, model, created_at, updated_at';

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertContentLength(content: string): void {
  if (content.length > CHAT_QUOTAS.contentCharsPerMessage) {
    throw new ChatQuotaError(
      'content',
      `Message exceeds ${CHAT_QUOTAS.contentCharsPerMessage} characters`,
    );
  }
}

export class SupabaseChatRepository implements IChatRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listThreads(userId: string): Promise<ChatThread[]> {
    const { data, error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .select(THREAD_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to list chat threads');
    return (data as ChatThreadRow[] | null)?.map(threadFromRow) ?? [];
  }

  async getThread(userId: string, threadId: string): Promise<ChatThread | null> {
    const { data, error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .select(THREAD_SELECT)
      .eq('user_id', userId)
      .eq('id', threadId)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Failed to load chat thread');
    if (!data) return null;
    return threadFromRow(data as ChatThreadRow);
  }

  async createThread(input: CreateThreadInput): Promise<ChatThread> {
    const count = await this.countThreads(input.userId);
    if (count >= CHAT_QUOTAS.threadsPerUser) {
      throw new ChatQuotaError(
        'threads',
        `Thread limit of ${CHAT_QUOTAS.threadsPerUser} reached`,
      );
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

    const { data, error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .insert(threadToInsertRow(thread))
      .select(THREAD_SELECT)
      .single();

    if (error) throw new Error(error.message || 'Failed to create chat thread');
    return threadFromRow(data as ChatThreadRow);
  }

  async updateThread(
    userId: string,
    threadId: string,
    patch: UpdateThreadPatch,
  ): Promise<ChatThread> {
    const updates: Record<string, unknown> = {
      updated_at: patch.updatedAt ?? nowIso(),
    };
    if (patch.title !== undefined) updates['title'] = patch.title;
    if (patch.lastProvider !== undefined) updates['last_provider'] = patch.lastProvider;
    if (patch.lastModel !== undefined) updates['last_model'] = patch.lastModel;

    const { data, error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .update(updates)
      .eq('user_id', userId)
      .eq('id', threadId)
      .select(THREAD_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Failed to update chat thread');
    if (!data) throw new Error('Chat thread not found');
    return threadFromRow(data as ChatThreadRow);
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const { error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', threadId);

    if (error) throw new Error(error.message || 'Failed to delete chat thread');
  }

  async countThreads(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(CHAT_THREADS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(error.message || 'Failed to count chat threads');
    return count ?? 0;
  }

  async listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from(CHAT_MESSAGES_TABLE)
      .select(MESSAGE_SELECT)
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message || 'Failed to list chat messages');
    return (data as ChatMessageRow[] | null)?.map(messageFromRow) ?? [];
  }

  async appendMessage(input: AppendMessageInput): Promise<MessageWriteResult> {
    assertContentLength(input.content);

    const msgCount = await this.countMessages(input.userId, input.threadId);
    if (msgCount >= CHAT_QUOTAS.messagesPerThread) {
      throw new ChatQuotaError(
        'messages',
        `Message limit of ${CHAT_QUOTAS.messagesPerThread} per thread reached`,
      );
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

    const { data, error } = await this.supabase
      .from(CHAT_MESSAGES_TABLE)
      .insert(messageToInsertRow(message))
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw new Error(error.message || 'Failed to append chat message');

    const threadPatch: UpdateThreadPatch = { updatedAt: ts };
    if (input.role === 'user' && input.content.trim()) {
      const existing = await this.listMessages(input.userId, input.threadId);
      const userCount = existing.filter((m) => m.role === 'user').length;
      if (userCount <= 1) {
        threadPatch.title = autoTitleFromUserMessage(input.content);
      }
    }
    if (input.provider) threadPatch.lastProvider = input.provider;
    if (input.model) threadPatch.lastModel = input.model;

    const thread = await this.updateThread(input.userId, input.threadId, threadPatch);
    return { message: messageFromRow(data as ChatMessageRow), thread };
  }

  async finalizeMessage(
    userId: string,
    messageId: string,
    patch: FinalizeMessagePatch,
  ): Promise<MessageWriteResult> {
    if (patch.content !== undefined) {
      assertContentLength(patch.content);
    }

    const existing = await this.supabase
      .from(CHAT_MESSAGES_TABLE)
      .select(MESSAGE_SELECT)
      .eq('user_id', userId)
      .eq('id', messageId)
      .maybeSingle();

    if (existing.error) {
      throw new Error(existing.error.message || 'Failed to load chat message');
    }
    if (!existing.data) throw new Error('Chat message not found');
    const current = messageFromRow(existing.data as ChatMessageRow);
    if (current.role !== 'assistant') {
      throw new Error('Only assistant messages can be finalized');
    }
    if (current.status !== 'streaming') {
      const thread = await this.getThread(userId, current.threadId);
      if (!thread) throw new Error('Chat thread not found');
      return { message: current, thread };
    }

    const updates: Record<string, unknown> = {
      status: patch.status,
      updated_at: nowIso(),
    };
    if (patch.content !== undefined) updates['content'] = patch.content;
    if (patch.provider !== undefined) updates['provider'] = patch.provider;
    if (patch.model !== undefined) updates['model'] = patch.model;

    const { data, error } = await this.supabase
      .from(CHAT_MESSAGES_TABLE)
      .update(updates)
      .eq('user_id', userId)
      .eq('id', messageId)
      .eq('status', 'streaming')
      .eq('role', 'assistant')
      .select(MESSAGE_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Failed to finalize chat message');
    if (!data) {
      const again = await this.supabase
        .from(CHAT_MESSAGES_TABLE)
        .select(MESSAGE_SELECT)
        .eq('user_id', userId)
        .eq('id', messageId)
        .maybeSingle();
      if (again.data) {
        const message = messageFromRow(again.data as ChatMessageRow);
        const thread = await this.getThread(userId, message.threadId);
        if (!thread) throw new Error('Chat thread not found');
        return { message, thread };
      }
      throw new Error('Chat message not found');
    }

    const message = messageFromRow(data as ChatMessageRow);
    const thread = await this.updateThread(userId, message.threadId, {
      updatedAt: message.updatedAt,
      lastProvider: patch.provider,
      lastModel: patch.model,
    });

    return { message, thread };
  }

  async countMessages(userId: string, threadId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(CHAT_MESSAGES_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('thread_id', threadId);

    if (error) throw new Error(error.message || 'Failed to count chat messages');
    return count ?? 0;
  }
}
