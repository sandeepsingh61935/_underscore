/**
 * Place-based Ask identity (domain | section | project).
 * One durable chat thread per place.
 */

import type { ChatScope } from './types';

export type Place =
  | { type: 'domain'; domain: string }
  | { type: 'section'; domain: string; sectionKey: string }
  | { type: 'project'; projectId: string };

export function placesEqual(a: Place, b: Place): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'domain' && b.type === 'domain') return a.domain === b.domain;
  if (a.type === 'section' && b.type === 'section') {
    return a.domain === b.domain && a.sectionKey === b.sectionKey;
  }
  if (a.type === 'project' && b.type === 'project') {
    return a.projectId === b.projectId;
  }
  return false;
}

/** Map place → thread scope (for persistence). */
export function placeToScope(place: Place): ChatScope {
  if (place.type === 'domain') return { kind: 'domain', domain: place.domain };
  if (place.type === 'section') {
    return {
      kind: 'section',
      domain: place.domain,
      sectionKey: place.sectionKey,
    };
  }
  return { kind: 'project', projectId: place.projectId };
}

/**
 * Map scope → place. library is not a place (returns null).
 */
export function scopeToPlace(scope: ChatScope): Place | null {
  if (scope.kind === 'domain') return { type: 'domain', domain: scope.domain };
  if (scope.kind === 'section') {
    return {
      type: 'section',
      domain: scope.domain,
      sectionKey: scope.sectionKey,
    };
  }
  if (scope.kind === 'project') {
    return { type: 'project', projectId: scope.projectId };
  }
  return null;
}

export function placeLabel(place: Place, projectTitle?: string): string {
  if (place.type === 'domain') return place.domain;
  if (place.type === 'section') {
    const parts = place.sectionKey.split('/').filter(Boolean);
    const tail = parts.length ? parts[parts.length - 1]! : place.sectionKey;
    return `${place.domain} › ${tail}`;
  }
  return projectTitle?.trim() || 'Project';
}
