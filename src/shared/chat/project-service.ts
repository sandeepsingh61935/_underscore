/**
 * Project CRUD + open place chat for a project.
 */

import type { ChatService } from './chat-service';
import type { IProjectRepository } from './i-project-repository';
import {
  LIBRARY_PROJECT_TITLE,
  membersEqual,
  type ChatProject,
  type ProjectMember,
} from './project-types';
import type { ChatThread } from './types';

export class ProjectService {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly chat: ChatService,
  ) {}

  listProjects(userId: string): Promise<ChatProject[]> {
    return this.projects.listProjects(userId);
  }

  getProject(userId: string, projectId: string): Promise<ChatProject | null> {
    return this.projects.getProject(userId, projectId);
  }

  createProject(
    userId: string,
    opts?: { title?: string; members?: ProjectMember[] },
  ): Promise<ChatProject> {
    return this.projects.createProject({
      userId,
      title: opts?.title,
      members: opts?.members,
    });
  }

  /** Multi-select → Untitled project with members. */
  createUntitledFromMembers(
    userId: string,
    members: ProjectMember[],
  ): Promise<ChatProject> {
    return this.projects.createProject({
      userId,
      title: 'Untitled project',
      members,
    });
  }

  /**
   * Stable "Library" project for multi-domain grounding (find-or-create).
   * Syncs domain members to the provided list so vault growth is reflected.
   * Does not create a new project on every call.
   */
  async resolveLibraryProject(
    userId: string,
    domainNames: string[],
  ): Promise<ChatProject> {
    const unique = [...new Set(domainNames.filter(Boolean))].sort();
    const members: ProjectMember[] = unique.map((domain) => ({
      kind: 'domain',
      domain,
    }));

    const existing = (await this.projects.listProjects(userId)).find(
      (p) => p.title === LIBRARY_PROJECT_TITLE,
    );

    if (!existing) {
      return this.projects.createProject({
        userId,
        title: LIBRARY_PROJECT_TITLE,
        members,
      });
    }

    const same =
      existing.members.length === members.length &&
      members.every((m) => existing.members.some((e) => membersEqual(e, m)));
    if (same) return existing;

    return this.projects.updateProject(userId, existing.id, { members });
  }

  renameProject(
    userId: string,
    projectId: string,
    title: string,
  ): Promise<ChatProject> {
    return this.projects.updateProject(userId, projectId, { title });
  }

  setMembers(
    userId: string,
    projectId: string,
    members: ProjectMember[],
  ): Promise<ChatProject> {
    return this.projects.updateProject(userId, projectId, { members });
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const threads = await this.chat.listThreads(userId);
    const thread = threads.find(
      (t) => t.scope.kind === 'project' && t.scope.projectId === projectId,
    );
    await this.projects.deleteProject(userId, projectId);
    if (thread) {
      await this.chat.deleteThread(userId, thread.id).catch(() => undefined);
    }
  }

  openProjectChat(userId: string, project: ChatProject): Promise<ChatThread> {
    return this.chat.resolvePlaceChat(
      userId,
      { type: 'project', projectId: project.id },
      { title: project.title },
    );
  }
}
