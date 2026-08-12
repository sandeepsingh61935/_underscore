/**
 * Chat persistence port (ADR-028). Cloud implementations are SoT;
 * IndexedDB is a cache adapter, not a second SoT.
 */

import type {
  AppendMessageInput,
  ChatMessage,
  ChatThread,
  CreateThreadInput,
  FinalizeMessagePatch,
  MessageWriteResult,
  UpdateThreadPatch,
} from './types';

export interface IChatRepository {
  listThreads(userId: string): Promise<ChatThread[]>;
  getThread(userId: string, threadId: string): Promise<ChatThread | null>;
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
}

export const CHAT_THREADS_TABLE = 'chat_threads';
export const CHAT_MESSAGES_TABLE = 'chat_messages';
