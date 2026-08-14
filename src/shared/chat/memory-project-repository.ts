import type {
  CreateProjectInput,
  IProjectRepository,
} from './i-project-repository';
import {
  PROJECT_QUOTAS,
  membersEqual,
  type ChatProject,
  type ProjectMember,
} from './project-types';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function dedupeMembers(members: ProjectMember[]): ProjectMember[] {
  const out: ProjectMember[] = [];
  for (const m of members) {
    if (!out.some((x) => membersEqual(x, m))) out.push(m);
  }
  return out;
}

/** In-memory project store for unit tests. */
export class MemoryProjectRepository implements IProjectRepository {
  private projects = new Map<string, ChatProject>();

  async listProjects(userId: string): Promise<ChatProject[]> {
    return [...this.projects.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getProject(
    userId: string,
    projectId: string,
  ): Promise<ChatProject | null> {
    const p = this.projects.get(projectId);
    if (!p || p.userId !== userId) return null;
    return structuredClone(p);
  }

  async createProject(input: CreateProjectInput): Promise<ChatProject> {
    const list = await this.listProjects(input.userId);
    if (list.length >= PROJECT_QUOTAS.projectsPerUser) {
      throw new Error(`Project limit of ${PROJECT_QUOTAS.projectsPerUser} reached`);
    }
    const members = dedupeMembers(input.members ?? []);
    if (members.length > PROJECT_QUOTAS.membersPerProject) {
      throw new Error(
        `Member limit of ${PROJECT_QUOTAS.membersPerProject} per project`,
      );
    }
    const ts = nowIso();
    const title = (input.title?.trim() || 'Untitled project').slice(
      0,
      PROJECT_QUOTAS.titleMaxChars,
    );
    const project: ChatProject = {
      id: input.id ?? newId(),
      userId: input.userId,
      title,
      members,
      createdAt: ts,
      updatedAt: ts,
    };
    this.projects.set(project.id, project);
    return structuredClone(project);
  }

  async updateProject(
    userId: string,
    projectId: string,
    patch: { title?: string; members?: ProjectMember[] },
  ): Promise<ChatProject> {
    const existing = await this.getProject(userId, projectId);
    if (!existing) throw new Error('Project not found');
    if (patch.title !== undefined) {
      existing.title = patch.title.trim().slice(0, PROJECT_QUOTAS.titleMaxChars) ||
        'Untitled project';
    }
    if (patch.members !== undefined) {
      const members = dedupeMembers(patch.members);
      if (members.length > PROJECT_QUOTAS.membersPerProject) {
        throw new Error(
          `Member limit of ${PROJECT_QUOTAS.membersPerProject} per project`,
        );
      }
      existing.members = members;
    }
    existing.updatedAt = nowIso();
    this.projects.set(projectId, existing);
    return structuredClone(existing);
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const existing = await this.getProject(userId, projectId);
    if (!existing) return;
    this.projects.delete(projectId);
  }
}
