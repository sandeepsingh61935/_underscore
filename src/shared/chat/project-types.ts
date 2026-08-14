/**
 * Chat projects — multi-domain/section grounding bags (one chat per project).
 */

export type ProjectMember =
  | { kind: 'domain'; domain: string }
  | { kind: 'section'; domain: string; sectionKey: string };

export interface ChatProject {
  id: string;
  userId: string;
  title: string;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_QUOTAS = {
  projectsPerUser: 100,
  membersPerProject: 50,
  titleMaxChars: 80,
} as const;

/** Stable multi-domain bag for extension "library" / whole-vault style asks. */
export const LIBRARY_PROJECT_TITLE = 'Library';

export function membersEqual(a: ProjectMember, b: ProjectMember): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'domain' && b.kind === 'domain') return a.domain === b.domain;
  if (a.kind === 'section' && b.kind === 'section') {
    return a.domain === b.domain && a.sectionKey === b.sectionKey;
  }
  return false;
}

export function summarizeMembers(members: readonly ProjectMember[]): string {
  const domains = members.filter((m) => m.kind === 'domain').length;
  const sections = members.filter((m) => m.kind === 'section').length;
  const parts: string[] = [];
  if (domains) parts.push(`${domains} domain${domains === 1 ? '' : 's'}`);
  if (sections) parts.push(`${sections} section${sections === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'No members';
}
