/**
 * Web chat projects session (place-based Ask).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatService } from '@/shared/chat';
import {
  ProjectService,
  SupabaseProjectRepository,
  type ChatProject,
  type ProjectMember,
} from '@/shared/chat';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export function useWebProjects(opts: {
  userId: string | null | undefined;
  enabled: boolean;
  chatService: ChatService | null;
}): {
  projects: ChatProject[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
  createUntitled: (members: ProjectMember[]) => Promise<ChatProject>;
  rename: (projectId: string, title: string) => Promise<void>;
  setMembers: (projectId: string, members: ProjectMember[]) => Promise<void>;
  remove: (projectId: string) => Promise<void>;
  projectService: ProjectService | null;
} {
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<ProjectService | null>(null);

  const getService = useCallback((): ProjectService | null => {
    if (!opts.chatService) return null;
    if (!serviceRef.current) {
      serviceRef.current = new ProjectService(
        new SupabaseProjectRepository(getWebSupabaseClient()),
        opts.chatService,
      );
    }
    return serviceRef.current;
  }, [opts.chatService]);

  // Reset project service when chat service instance changes
  useEffect(() => {
    serviceRef.current = null;
  }, [opts.chatService]);

  const refresh = useCallback(async () => {
    if (!opts.userId || !opts.enabled) {
      setProjects([]);
      setStatus('idle');
      return;
    }
    const svc = getService();
    if (!svc) {
      setStatus('idle');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setError(null);
    try {
      const list = await svc.listProjects(opts.userId);
      setProjects(list);
      setStatus('ready');
    } catch (err) {
      setError((err as Error).message || 'Failed to load projects');
      setStatus('error');
    }
  }, [getService, opts.enabled, opts.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createUntitled = useCallback(
    async (members: ProjectMember[]) => {
      if (!opts.userId) throw new Error('Sign in required');
      const svc = getService();
      if (!svc) throw new Error('Chat not ready');
      const p = await svc.createUntitledFromMembers(opts.userId, members);
      await refresh();
      return p;
    },
    [getService, opts.userId, refresh],
  );

  const rename = useCallback(
    async (projectId: string, title: string) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      await svc.renameProject(opts.userId, projectId, title);
      await refresh();
    },
    [getService, opts.userId, refresh],
  );

  const setMembers = useCallback(
    async (projectId: string, members: ProjectMember[]) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      await svc.setMembers(opts.userId, projectId, members);
      await refresh();
    },
    [getService, opts.userId, refresh],
  );

  const remove = useCallback(
    async (projectId: string) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      await svc.deleteProject(opts.userId, projectId);
      await refresh();
    },
    [getService, opts.userId, refresh],
  );

  return useMemo(
    () => ({
      projects,
      status,
      error,
      refresh,
      createUntitled,
      rename,
      setMembers,
      remove,
      projectService: opts.userId && opts.enabled ? getService() : null,
    }),
    [
      projects,
      status,
      error,
      refresh,
      createUntitled,
      rename,
      setMembers,
      remove,
      opts.userId,
      opts.enabled,
      getService,
    ],
  );
}
