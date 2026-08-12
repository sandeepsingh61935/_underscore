/**
 * Web grounded chat: hydrate threads/messages via CachedChatRepository (ADR-028).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CachedChatRepository,
  ChatService,
  IndexedDbChatCache,
  MemoryChatCache,
  SupabaseChatRepository,
  type ChatMessage,
  type ChatScope,
  type ChatThread,
  type IChatCache,
} from '@/shared/chat';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export type WebChatStatus = 'idle' | 'loading' | 'ready' | 'error';

function createCache(): IChatCache {
  try {
    if (typeof indexedDB !== 'undefined') {
      return new IndexedDbChatCache();
    }
  } catch {
    /* fall through */
  }
  return new MemoryChatCache();
}

function createService(): ChatService {
  const supabase = getWebSupabaseClient();
  const remote = new SupabaseChatRepository(supabase);
  const cache = createCache();
  return new ChatService(new CachedChatRepository(remote, cache));
}

export function useWebChat(opts: {
  userId: string | null | undefined;
  enabled: boolean;
}): {
  status: WebChatStatus;
  error: string | null;
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  refreshThreads: () => Promise<void>;
  selectThread: (threadId: string | null) => Promise<void>;
  newThread: () => void;
  deleteThread: (threadId: string) => Promise<void>;
  beginTurn: (input: {
    question: string;
    scope: ChatScope;
    provider?: string;
    model?: string;
  }) => Promise<{
    thread: ChatThread;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
  }>;
  finalizeTurn: (input: {
    assistantMessageId: string;
    content: string;
    status: 'completed' | 'failed' | 'cancelled';
    provider?: string;
    model?: string;
  }) => Promise<ChatMessage>;
  /** Optimistic local message patch (streaming deltas). */
  patchLocalMessage: (
    messageId: string,
    patch: Partial<Pick<ChatMessage, 'content' | 'status'>>,
  ) => void;
  replaceMessages: (threadId: string, messages: ChatMessage[]) => void;
} {
  const serviceRef = useRef<ChatService | null>(null);
  const [status, setStatus] = useState<WebChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const getService = useCallback((): ChatService => {
    if (!serviceRef.current) {
      serviceRef.current = createService();
    }
    return serviceRef.current;
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!opts.userId || !opts.enabled) {
      setThreads([]);
      setStatus('idle');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setError(null);
    try {
      const list = await getService().listThreads(opts.userId);
      setThreads(list);
      setStatus('ready');
    } catch (err) {
      setError((err as Error).message || 'Failed to load chats');
      setStatus('error');
    }
  }, [getService, opts.enabled, opts.userId]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  const selectThread = useCallback(
    async (threadId: string | null) => {
      setActiveThreadId(threadId);
      if (!threadId || !opts.userId) {
        setMessages([]);
        return;
      }
      try {
        const list = await getService().listMessages(opts.userId, threadId);
        // Stale streaming rows from prior sessions are not live — terminalize.
        const recovered: ChatMessage[] = [];
        for (const m of list) {
          if (m.role === 'assistant' && m.status === 'streaming') {
            try {
              const done = await getService().finalizeTurn({
                userId: opts.userId,
                assistantMessageId: m.id,
                content: m.content,
                status: 'cancelled',
              });
              recovered.push(done);
            } catch {
              recovered.push({ ...m, status: 'cancelled' });
            }
          } else {
            recovered.push(m);
          }
        }
        setMessages(recovered);
      } catch (err) {
        setError((err as Error).message || 'Failed to load messages');
      }
    },
    [getService, opts.userId],
  );

  const newThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
  }, []);

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!opts.userId) return;
      await getService().deleteThread(opts.userId, threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
    },
    [activeThreadId, getService, opts.userId],
  );

  const beginTurn = useCallback(
    async (input: {
      question: string;
      scope: ChatScope;
      provider?: string;
      model?: string;
    }) => {
      if (!opts.userId) throw new Error('Sign in required for chat history');
      const result = await getService().beginTurn({
        userId: opts.userId,
        threadId: activeThreadId,
        scope: input.scope,
        question: input.question,
        provider: input.provider,
        model: input.model,
      });

      setActiveThreadId(result.thread.id);
      setThreads((prev) => {
        const without = prev.filter((t) => t.id !== result.thread.id);
        return [result.thread, ...without];
      });
      setMessages((prev) => {
        const base =
          activeThreadId === result.thread.id
            ? prev.filter(
                (m) =>
                  m.id !== result.userMessage.id &&
                  m.id !== result.assistantMessage.id,
              )
            : [];
        return [...base, result.userMessage, result.assistantMessage];
      });

      return result;
    },
    [activeThreadId, getService, opts.userId],
  );

  const finalizeTurn = useCallback(
    async (input: {
      assistantMessageId: string;
      content: string;
      status: 'completed' | 'failed' | 'cancelled';
      provider?: string;
      model?: string;
    }) => {
      if (!opts.userId) throw new Error('Sign in required for chat history');
      const message = await getService().finalizeTurn({
        userId: opts.userId,
        assistantMessageId: input.assistantMessageId,
        content: input.content,
        status: input.status,
        provider: input.provider,
        model: input.model,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m)),
      );
      // Bump thread to top
      setThreads((prev) => {
        const hit = prev.find((t) => t.id === message.threadId);
        if (!hit) return prev;
        const updated = {
          ...hit,
          updatedAt: message.updatedAt,
          lastProvider: message.provider ?? hit.lastProvider,
          lastModel: message.model ?? hit.lastModel,
        };
        return [updated, ...prev.filter((t) => t.id !== message.threadId)];
      });
      return message;
    },
    [getService, opts.userId],
  );

  const patchLocalMessage = useCallback(
    (
      messageId: string,
      patch: Partial<Pick<ChatMessage, 'content' | 'status'>>,
    ) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const replaceMessages = useCallback(
    (threadId: string, next: ChatMessage[]) => {
      if (activeThreadId === threadId) setMessages(next);
    },
    [activeThreadId],
  );

  return useMemo(
    () => ({
      status,
      error,
      threads,
      activeThreadId,
      messages,
      refreshThreads,
      selectThread,
      newThread,
      deleteThread,
      beginTurn,
      finalizeTurn,
      patchLocalMessage,
      replaceMessages,
    }),
    [
      status,
      error,
      threads,
      activeThreadId,
      messages,
      refreshThreads,
      selectThread,
      newThread,
      deleteThread,
      beginTurn,
      finalizeTurn,
      patchLocalMessage,
      replaceMessages,
    ],
  );
}
