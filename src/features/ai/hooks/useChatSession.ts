/**
 * Shared grounded-chat session state (ADR-028).
 * Platform supplies Supabase via getSupabase; turn orchestration is separate.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createChatService,
  type BeginTurnResult,
  type ChatMessage,
  type ChatService,
  type ChatThread,
  type MessageWriteResult,
} from '@/shared/chat';

export type ChatSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useChatSession(opts: {
  userId: string | null | undefined;
  enabled: boolean;
  getSupabase: () => SupabaseClient;
}): {
  status: ChatSessionStatus;
  error: string | null;
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  service: ChatService | null;
  refreshThreads: () => Promise<void>;
  selectThread: (threadId: string | null) => Promise<void>;
  newThread: () => void;
  deleteThread: (threadId: string) => Promise<void>;
  applyTurnStarted: (turn: BeginTurnResult) => void;
  applyStreamText: (assistantId: string, content: string) => void;
  applyTurnFinished: (result: MessageWriteResult) => void;
} {
  const serviceRef = useRef<ChatService | null>(null);
  const getSupabaseRef = useRef(opts.getSupabase);
  getSupabaseRef.current = opts.getSupabase;

  const [status, setStatus] = useState<ChatSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const getService = useCallback((): ChatService => {
    if (!serviceRef.current) {
      serviceRef.current = createChatService(getSupabaseRef.current());
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
