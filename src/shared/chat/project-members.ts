/**
 * Project member set helpers (domain | section).
 */

import { membersEqual, type ProjectMember } from './project-types';
import type { Place } from './place';

/** Convert a domain/section place into a project member. Projects cannot be members. */
export function placeToMember(place: Place): ProjectMember | null {
  if (place.type === 'domain') return { kind: 'domain', domain: place.domain };
  if (place.type === 'section') {
    return {
      kind: 'section',
      domain: place.domain,
      sectionKey: place.sectionKey,
    };
  }
  return null;
}

export function memberToLabel(m: ProjectMember): string {
  if (m.kind === 'domain') return m.domain;
  const parts = m.sectionKey.split('/').filter(Boolean);
  const tail = parts.length ? parts[parts.length - 1]! : m.sectionKey || '/';
  return `${m.domain} › ${tail}`;
}

export function hasMember(
  members: readonly ProjectMember[],
  member: ProjectMember,
): boolean {
  return members.some((m) => membersEqual(m, member));
}

export function addMember(
  members: readonly ProjectMember[],
  member: ProjectMember,
): ProjectMember[] {
  if (hasMember(members, member)) return [...members];
  return [...members, member];
}

export function removeMember(
  members: readonly ProjectMember[],
  member: ProjectMember,
): ProjectMember[] {
  return members.filter((m) => !membersEqual(m, member));
}

/** Drag payload for domain/page → project drop. */
export const PROJECT_MEMBER_DRAG_TYPE = 'application/x-underscore-project-member';

export function serializeMemberDrag(member: ProjectMember): string {
  return JSON.stringify(member);
}

export function parseMemberDrag(raw: string): ProjectMember | null {
  try {
    const v = JSON.parse(raw) as ProjectMember;
    if (v?.kind === 'domain' && typeof v.domain === 'string') {
      return { kind: 'domain', domain: v.domain };
    }
    if (
      v?.kind === 'section' &&
      typeof v.domain === 'string' &&
      typeof v.sectionKey === 'string'
    ) {
      return {
        kind: 'section',
        domain: v.domain,
        sectionKey: v.sectionKey,
      };
    }
    return null;
  } catch {
    return null;
  }
}
