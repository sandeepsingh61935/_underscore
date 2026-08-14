import type { ChatScope, ChatScopeKind } from './types';

export function scopeKind(scope: ChatScope): ChatScopeKind {
  return scope.kind;
}

export function scopeDomain(scope: ChatScope): string | null {
  if (scope.kind === 'library' || scope.kind === 'project') return null;
  return scope.domain;
}

export function scopeSectionKey(scope: ChatScope): string | null {
  if (scope.kind === 'section') return scope.sectionKey;
  return null;
}

export function scopeProjectId(scope: ChatScope): string | null {
  if (scope.kind === 'project') return scope.projectId;
  return null;
}

export function parseChatScope(
  kind: string,
  domain: string | null | undefined,
  sectionKey: string | null | undefined,
  projectId?: string | null | undefined,
): ChatScope {
  if (kind === 'library') {
    return { kind: 'library' };
  }
  if (kind === 'domain') {
    if (!domain) throw new Error('domain scope requires domain');
    return { kind: 'domain', domain };
  }
  if (kind === 'section') {
    if (!domain || !sectionKey) {
      throw new Error('section scope requires domain and sectionKey');
    }
    return { kind: 'section', domain, sectionKey };
  }
  if (kind === 'project') {
    if (!projectId) throw new Error('project scope requires projectId');
    return { kind: 'project', projectId };
  }
  throw new Error(`Unknown chat scope kind: ${kind}`);
}

export function scopesEqual(a: ChatScope, b: ChatScope): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'library') return true;
  if (a.kind === 'domain' && b.kind === 'domain') {
    return a.domain === b.domain;
  }
  if (a.kind === 'section' && b.kind === 'section') {
    return a.domain === b.domain && a.sectionKey === b.sectionKey;
  }
  if (a.kind === 'project' && b.kind === 'project') {
    return a.projectId === b.projectId;
  }
  return false;
}

/** Human label for scope pill / thread meta. */
export function scopeLabel(scope: ChatScope): string {
  if (scope.kind === 'library') return 'Library';
  if (scope.kind === 'domain') return scope.domain;
  if (scope.kind === 'project') return 'Project';
  const parts = scope.sectionKey.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : scope.sectionKey;
}

/** Prompt ScopeKind for templates (library/project map to domain-wide phrasing). */
export function scopeKindForPrompt(scope: ChatScope): 'section' | 'domain' {
  return scope.kind === 'section' ? 'section' : 'domain';
}
