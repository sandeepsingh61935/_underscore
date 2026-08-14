/**
 * Supabase SoT for chat projects + members.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  CHAT_PROJECT_MEMBERS_TABLE,
  CHAT_PROJECTS_TABLE,
  type CreateProjectInput,
  type IProjectRepository,
} from './i-project-repository';
import {
  PROJECT_QUOTAS,
  membersEqual,
  type ChatProject,
  type ProjectMember,
} from './project-types';

type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  member_kind: string;
  domain: string;
  section_key: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function memberFromRow(row: MemberRow): ProjectMember {
  if (row.member_kind === 'section') {
    return {
      kind: 'section',
      domain: row.domain,
      sectionKey: row.section_key ?? '',
    };
  }
  return { kind: 'domain', domain: row.domain };
}

function dedupeMembers(members: ProjectMember[]): ProjectMember[] {
  const out: ProjectMember[] = [];
  for (const m of members) {
    if (!out.some((x) => membersEqual(x, m))) out.push(m);
  }
  return out;
}

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listProjects(userId: string): Promise<ChatProject[]> {
    const { data, error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .select('id, user_id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to list projects');
    const rows = (data as ProjectRow[] | null) ?? [];
    if (rows.length === 0) return [];

    // One members query for all projects (not N+1).
    const { data: memberData, error: memberError } = await this.supabase
      .from(CHAT_PROJECT_MEMBERS_TABLE)
      .select('id, project_id, user_id, member_kind, domain, section_key')
      .eq('user_id', userId);

    if (memberError) {
      throw new Error(memberError.message || 'Failed to load project members');
    }

    const byProject = new Map<string, ProjectMember[]>();
    for (const row of (memberData as MemberRow[] | null) ?? []) {
      const list = byProject.get(row.project_id) ?? [];
      list.push(memberFromRow(row));
      byProject.set(row.project_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      members: byProject.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async countProjects(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(error.message || 'Failed to count projects');
    return count ?? 0;
  }

  async getProject(
    userId: string,
    projectId: string,
  ): Promise<ChatProject | null> {
    const { data, error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .select('id, user_id, title, created_at, updated_at')
      .eq('user_id', userId)
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Failed to load project');
    if (!data) return null;
    const row = data as ProjectRow;
    const members = await this.loadMembers(userId, projectId);
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      members,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createProject(input: CreateProjectInput): Promise<ChatProject> {
    // Cheap count — never load full list + all members just for quota.
    const count = await this.countProjects(input.userId);
    if (count >= PROJECT_QUOTAS.projectsPerUser) {
      throw new Error(`Project limit of ${PROJECT_QUOTAS.projectsPerUser} reached`);
    }
    const members = dedupeMembers(input.members ?? []);
    if (members.length > PROJECT_QUOTAS.membersPerProject) {
      throw new Error(
        `Member limit of ${PROJECT_QUOTAS.membersPerProject} per project`,
      );
    }

    const ts = nowIso();
    const id = input.id ?? newId();
    const title = (input.title?.trim() || 'Untitled project').slice(
      0,
      PROJECT_QUOTAS.titleMaxChars,
    );

    const { data, error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .insert({
        id,
        user_id: input.userId,
        title,
        created_at: ts,
        updated_at: ts,
      })
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (error) throw new Error(error.message || 'Failed to create project');
    // Empty members: one insert only (skip members round-trips).
    if (members.length > 0) {
      await this.replaceMembers(input.userId, id, members);
    }
    return {
      id,
      userId: input.userId,
      title,
      members,
      createdAt: (data as ProjectRow).created_at,
      updatedAt: (data as ProjectRow).updated_at,
    };
  }

  async updateProject(
    userId: string,
    projectId: string,
    patch: { title?: string; members?: ProjectMember[] },
  ): Promise<ChatProject> {
    const updates: Record<string, unknown> = { updated_at: nowIso() };
    if (patch.title !== undefined) {
      updates['title'] =
        patch.title.trim().slice(0, PROJECT_QUOTAS.titleMaxChars) ||
        'Untitled project';
    }

    const { data, error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .update(updates)
      .eq('user_id', userId)
      .eq('id', projectId)
      .select('id, user_id, title, created_at, updated_at')
      .maybeSingle();

    if (error) throw new Error(error.message || 'Failed to update project');
    if (!data) throw new Error('Project not found');

    if (patch.members !== undefined) {
      const members = dedupeMembers(patch.members);
      if (members.length > PROJECT_QUOTAS.membersPerProject) {
        throw new Error(
          `Member limit of ${PROJECT_QUOTAS.membersPerProject} per project`,
        );
      }
      await this.replaceMembers(userId, projectId, members);
    }

    return (await this.getProject(userId, projectId))!;
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from(CHAT_PROJECTS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', projectId);
    if (error) throw new Error(error.message || 'Failed to delete project');
  }

  private async loadMembers(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember[]> {
    const { data, error } = await this.supabase
      .from(CHAT_PROJECT_MEMBERS_TABLE)
      .select('id, project_id, user_id, member_kind, domain, section_key')
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) throw new Error(error.message || 'Failed to load project members');
    return ((data as MemberRow[] | null) ?? []).map(memberFromRow);
  }

  private async replaceMembers(
    userId: string,
    projectId: string,
    members: ProjectMember[],
  ): Promise<void> {
    const { error: delErr } = await this.supabase
      .from(CHAT_PROJECT_MEMBERS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);
    if (delErr) throw new Error(delErr.message || 'Failed to clear members');

    if (members.length === 0) return;

    const rows = members.map((m) => ({
      id: newId(),
      project_id: projectId,
      user_id: userId,
      member_kind: m.kind,
      domain: m.domain,
      section_key: m.kind === 'section' ? m.sectionKey : null,
    }));

    const { error } = await this.supabase
      .from(CHAT_PROJECT_MEMBERS_TABLE)
      .insert(rows);
    if (error) throw new Error(error.message || 'Failed to save project members');
  }
}
