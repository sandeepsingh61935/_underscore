/**
 * Project CRUD + open place chat for a project.
 */

import type { ChatService } from './chat-service';
import type { IProjectRepository } from './i-project-repository';
import type { ChatProject, ProjectMember } from './project-types';
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
