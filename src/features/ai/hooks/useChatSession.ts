/**
 * Shared grounded-chat session state (ADR-028).
 * Platform supplies Supabase via getSupabase; turn orchestration is separate.
 *
 * Service construction is effect-bound (never throws during render).
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
  const getSupabaseRef = useRef(opts.getSupabase);
  getSupabaseRef.current = opts.getSupabase;

  const [service, setService] = useState<ChatService | null>(null);
  const [status, setStatus] = useState<ChatSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Build service off the render path so missing env / client errors don't white-screen.
  useEffect(() => {
    if (!opts.enabled || !opts.userId) {
      setService(null);
      return;
    }
    try {
      setService(createChatService(getSupabaseRef.current()));
    } catch (err) {
      setService(null);
      setError((err as Error).message || 'Chat unavailable');
      setStatus('error');
    }
  }, [opts.enabled, opts.userId]);

  const refreshThreads = useCallback(async () => {
    if (!opts.userId || !opts.enabled || !service) {
      setThreads([]);
      setStatus(opts.enabled && opts.userId ? 'loading' : 'idle');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setError(null);
    try {
      const list = await service.listThreads(opts.userId);
      setThreads(list);
      setStatus('ready');
    } catch (err) {
      setError((err as Error).message || 'Failed to load chats');
      setStatus('error');
    }
  }, [service, opts.enabled, opts.userId]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  const selectThread = useCallback(
    async (threadId: string | null) => {
      setActiveThreadId(threadId);
      if (!threadId || !opts.userId || !service) {
        setMessages([]);
        return;
      }
      try {
        const list = await service.listMessagesRecovered(opts.userId, threadId);
        setMessages(list);
      } catch (err) {
        setError((err as Error).message || 'Failed to load messages');
      }
    },
    [service, opts.userId],
  );

  const newThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
  }, []);

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!opts.userId || !service) return;
      await service.deleteThread(opts.userId, threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
    },
    [activeThreadId, service, opts.userId],
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
      service: opts.userId && opts.enabled ? service : null,
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
      service,
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
