/**
 * Web chat session state: threads list + active transcript (ADR-028).
 * Turn orchestration lives in useGroundedChatTurn / runGroundedTurn.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CachedChatRepository,
  ChatService,
  IndexedDbChatCache,
  MemoryChatCache,
  SupabaseChatRepository,
  type BeginTurnResult,
  type ChatMessage,
  type ChatThread,
  type IChatCache,
  type MessageWriteResult,
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
  return new ChatService(new CachedChatRepository(remote, createCache()));
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
  service: ChatService | null;
  refreshThreads: () => Promise<void>;
  selectThread: (threadId: string | null) => Promise<void>;
  newThread: () => void;
  deleteThread: (threadId: string) => Promise<void>;
  /** Apply beginTurn result into local session state. */
  applyTurnStarted: (turn: BeginTurnResult) => void;
  /** Apply streaming text onto an assistant message. */
  applyStreamText: (assistantId: string, content: string) => void;
  /** Apply finalize result into local session state. */
  applyTurnFinished: (result: MessageWriteResult) => void;
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
        const list = await getService().listMessagesRecovered(
          opts.userId,
          threadId,
        );
        setMessages(list);
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

  const applyTurnStarted = useCallback(
    (turn: BeginTurnResult) => {
      setActiveThreadId(turn.thread.id);
      setThreads((prev) => {
        const without = prev.filter((t) => t.id !== turn.thread.id);
        return [turn.thread, ...without];
      });
      setMessages((prev) => {
        const sameThread = activeThreadId === turn.thread.id;
        const base = sameThread
          ? prev.filter(
              (m) =>
                m.id !== turn.userMessage.id &&
                m.id !== turn.assistantMessage.id,
            )
          : [];
        return [...base, turn.userMessage, turn.assistantMessage];
      });
    },
    [activeThreadId],
  );

  const applyStreamText = useCallback((assistantId: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content, status: 'streaming' as const }
          : m,
      ),
    );
  }, []);

  const applyTurnFinished = useCallback((result: MessageWriteResult) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === result.message.id ? result.message : m)),
    );
    setThreads((prev) => {
      const without = prev.filter((t) => t.id !== result.thread.id);
      return [result.thread, ...without];
    });
  }, []);

  return useMemo(
    () => ({
      status,
      error,
      threads,
      activeThreadId,
      messages,
      service: opts.userId && opts.enabled ? getService() : null,
      refreshThreads,
      selectThread,
      newThread,
      deleteThread,
      applyTurnStarted,
      applyStreamText,
      applyTurnFinished,
    }),
    [
      status,
      error,
      threads,
      activeThreadId,
      messages,
      opts.userId,
      opts.enabled,
      getService,
      refreshThreads,
      selectThread,
      newThread,
      deleteThread,
      applyTurnStarted,
      applyStreamText,
      applyTurnFinished,
    ],
  );
}
