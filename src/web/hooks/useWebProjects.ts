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

  // Build off render path — never construct clients during render.
  useEffect(() => {
    if (!opts.chatService || !opts.enabled || !opts.userId) {
      serviceRef.current = null;
      return;
    }
    try {
      serviceRef.current = new ProjectService(
        new SupabaseProjectRepository(getWebSupabaseClient()),
        opts.chatService,
      );
    } catch (err) {
      serviceRef.current = null;
      setError((err as Error).message || 'Projects unavailable');
      setStatus('error');
    }
  }, [opts.chatService, opts.enabled, opts.userId]);

  const getService = useCallback((): ProjectService | null => {
    return serviceRef.current;
  }, []);

  const refresh = useCallback(async () => {
    if (!opts.userId || !opts.enabled) {
      setProjects([]);
      setStatus('idle');
      return;
    }
    const svc = getService();
    if (!svc) {
      setStatus(opts.chatService ? 'loading' : 'idle');
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
  }, [getService, opts.chatService, opts.enabled, opts.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, opts.chatService]);

  const createUntitled = useCallback(
    async (members: ProjectMember[]) => {
      if (!opts.userId) throw new Error('Sign in required');
      const svc = getService();
      if (!svc) throw new Error('Chat not ready');
      // Single insert path; prepend locally — no full listProjects refresh.
      const p = await svc.createUntitledFromMembers(opts.userId, members);
      setProjects((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
      setStatus('ready');
      return p;
    },
    [getService, opts.userId],
  );

  const rename = useCallback(
    async (projectId: string, title: string) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      const updated = await svc.renameProject(opts.userId, projectId, title);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
    },
    [getService, opts.userId],
  );

  const setMembers = useCallback(
    async (projectId: string, members: ProjectMember[]) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      const updated = await svc.setMembers(opts.userId, projectId, members);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
    },
    [getService, opts.userId],
  );

  const remove = useCallback(
    async (projectId: string) => {
      if (!opts.userId) return;
      const svc = getService();
      if (!svc) return;
      await svc.deleteProject(opts.userId, projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    },
    [getService, opts.userId],
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
      projectService: opts.userId && opts.enabled ? serviceRef.current : null,
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
      opts.chatService,
    ],
  );
}
