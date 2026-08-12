import { parseChatScope, scopeDomain, scopeKind, scopeSectionKey } from './chat-scope';
import type { ChatMessage, ChatMessageRole, ChatMessageStatus, ChatThread } from './types';

export type ChatThreadRow = {
  id: string;
  user_id: string;
  title: string;
  scope_kind: string;
  domain: string | null;
  section_key: string | null;
  last_provider: string | null;
  last_model: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  role: string;
  content: string;
  status: string;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export function threadFromRow(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    scope: parseChatScope(row.scope_kind, row.domain, row.section_key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastProvider: row.last_provider ?? undefined,
    lastModel: row.last_model ?? undefined,
  };
}

export function threadToInsertRow(thread: ChatThread): ChatThreadRow {
  return {
    id: thread.id,
    user_id: thread.userId,
    title: thread.title,
    scope_kind: scopeKind(thread.scope),
    domain: scopeDomain(thread.scope),
    section_key: scopeSectionKey(thread.scope),
    last_provider: thread.lastProvider ?? null,
    last_model: thread.lastModel ?? null,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  };
}

export function messageFromRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    role: row.role as ChatMessageRole,
    content: row.content,
    status: row.status as ChatMessageStatus,
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function messageToInsertRow(message: ChatMessage): ChatMessageRow {
  return {
    id: message.id,
    thread_id: message.threadId,
    user_id: message.userId,
    role: message.role,
    content: message.content,
    status: message.status,
    provider: message.provider ?? null,
    model: message.model ?? null,
    created_at: message.createdAt,
    updated_at: message.updatedAt,
  };
}
