/**
 * Filter highlights for a place (domain / section / project members).
 */

import type { Place } from './place';
import type { ProjectMember } from './project-types';

export interface PlaceHighlight {
  id: string;
  domain: string;
  /** Section path/key (may be path from library). */
  path: string;
  text: string;
  url?: string;
}

function memberMatches(
  h: PlaceHighlight,
  member: ProjectMember,
): boolean {
  if (member.kind === 'domain') return h.domain === member.domain;
  return h.domain === member.domain && h.path === member.sectionKey;
}

export function highlightsForPlace(
  highlights: readonly PlaceHighlight[],
  place: Place,
  projectMembers?: readonly ProjectMember[],
): PlaceHighlight[] {
  if (place.type === 'domain') {
    return highlights.filter((h) => h.domain === place.domain);
  }
  if (place.type === 'section') {
    return highlights.filter(
      (h) => h.domain === place.domain && h.path === place.sectionKey,
    );
  }
  const members = projectMembers ?? [];
  if (members.length === 0) return [];
  const seen = new Set<string>();
  const out: PlaceHighlight[] = [];
  for (const h of highlights) {
    if (seen.has(h.id)) continue;
    if (members.some((m) => memberMatches(h, m))) {
      seen.add(h.id);
      out.push(h);
    }
  }
  return out;
}
