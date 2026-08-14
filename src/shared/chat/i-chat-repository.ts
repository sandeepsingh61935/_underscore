/**
 * Chat persistence port (ADR-028). Cloud implementations are SoT;
 * IndexedDB is a cache adapter, not a second SoT.
 */

import type {
  AppendMessageInput,
  ChatMessage,
  ChatScope,
  ChatThread,
  CreateThreadInput,
  FinalizeMessagePatch,
  MessageWriteResult,
  UpdateThreadPatch,
} from './types';

export interface IChatRepository {
  listThreads(userId: string): Promise<ChatThread[]>;
  getThread(userId: string, threadId: string): Promise<ChatThread | null>;
  /** Most recently updated thread matching scope, or null. */
  findThreadByScope(
    userId: string,
    scope: ChatScope,
  ): Promise<ChatThread | null>;
  createThread(input: CreateThreadInput): Promise<ChatThread>;
  updateThread(
    userId: string,
    threadId: string,
    patch: UpdateThreadPatch,
  ): Promise<ChatThread>;
  deleteThread(userId: string, threadId: string): Promise<void>;
  countThreads(userId: string): Promise<number>;

  listMessages(userId: string, threadId: string): Promise<ChatMessage[]>;
  appendMessage(input: AppendMessageInput): Promise<MessageWriteResult>;
  finalizeMessage(
    userId: string,
    messageId: string,
    patch: FinalizeMessagePatch,
  ): Promise<MessageWriteResult>;
  countMessages(userId: string, threadId: string): Promise<number>;
  /** Hard-delete all messages in a thread (clear conversation). */
  clearMessages(userId: string, threadId: string): Promise<void>;
}

export const CHAT_THREADS_TABLE = 'chat_threads';
export const CHAT_MESSAGES_TABLE = 'chat_messages';
