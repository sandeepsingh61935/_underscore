import type { ChatProject, ProjectMember } from './project-types';

export const CHAT_PROJECTS_TABLE = 'chat_projects';
export const CHAT_PROJECT_MEMBERS_TABLE = 'chat_project_members';

export interface CreateProjectInput {
  userId: string;
  title?: string;
  members?: ProjectMember[];
  id?: string;
}

export interface IProjectRepository {
  listProjects(userId: string): Promise<ChatProject[]>;
  /** Cheap quota check — must not load members. */
  countProjects(userId: string): Promise<number>;
  getProject(userId: string, projectId: string): Promise<ChatProject | null>;
  createProject(input: CreateProjectInput): Promise<ChatProject>;
  updateProject(
    userId: string,
    projectId: string,
    patch: { title?: string; members?: ProjectMember[] },
  ): Promise<ChatProject>;
  deleteProject(userId: string, projectId: string): Promise<void>;
}
