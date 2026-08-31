/**
 * @file llm-artifact-service.ts
 * @description Pure logic for LLM artifact upsert, scope queries, and staleness.
 */

import type {
  LlmArtifact,
  LlmArtifactKind,
  LlmArtifactScope,
  SaveLlmArtifactInput,
} from '@/shared/schemas/llm-artifact-schema';

export const SCOPE_QUERY_CAP = 10;

export function scopeMatches(artifact: LlmArtifact, scope: LlmArtifactScope): boolean {
  if (scope.kind === 'domain') {
    return artifact.scope.kind === 'domain' && artifact.scope.domain === scope.domain;
  }
  return (
    artifact.scope.kind === 'section' &&
    artifact.scope.domain === scope.domain &&
    artifact.scope.sectionKey === scope.sectionKey
  );
}

export function isArtifactStale(
  artifact: LlmArtifact,
  currentHighlightCount: number
): boolean {
  return artifact.highlightCountAtGeneration !== currentHighlightCount;
}

export function upsertArtifact(
  existing: LlmArtifact[],
  incoming: LlmArtifact
): LlmArtifact[] {
  if (incoming.kind === 'scope_query') {
    const sameScope = existing.filter(
      (a) => a.kind === 'scope_query' && scopeMatches(a, incoming.scope)
    );
    const other = existing.filter(
      (a) => !(a.kind === 'scope_query' && scopeMatches(a, incoming.scope))
    );
    const next = [...sameScope, incoming].slice(-SCOPE_QUERY_CAP);
    return [...other, ...next];
  }

  const filtered = existing.filter(
    (a) => !(a.kind === incoming.kind && scopeMatches(a, incoming.scope))
  );
  return [...filtered, incoming];
}

export function getArtifactsForScope(
  artifacts: LlmArtifact[],
  scope: LlmArtifactScope,
  kind?: LlmArtifactKind
): LlmArtifact[] {
  return artifacts
    .filter((a) => scopeMatches(a, scope) && (kind === undefined || a.kind === kind))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function buildLlmArtifact(input: SaveLlmArtifactInput, id?: string): LlmArtifact {
  const now = new Date().toISOString();
  const artifactId =
    id ??
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    id: artifactId,
    kind: input.kind,
    scope: input.scope,
    content: input.content,
    question: input.question,
    highlightCountAtGeneration: input.highlightCountAtGeneration,
    provider: input.provider,
    createdAt: now,
    updatedAt: now,
  };
}

export function applySave(
  existing: LlmArtifact[],
  input: SaveLlmArtifactInput
): LlmArtifact[] {
  const artifact = buildLlmArtifact(input);
  return upsertArtifact(existing, artifact);
}

export interface ExportArtifactsBundle {
  domainSynthesis?: LlmArtifact;
  sectionSummary?: LlmArtifact;
  scopeQueries: LlmArtifact[];
}

export function bundleArtifactsForExport(
  artifacts: LlmArtifact[],
  scope:
    | { kind: 'library' }
    | { kind: 'domain'; domain: string }
    | { kind: 'section'; domain: string; sectionKey: string }
    | { kind: 'highlight'; highlightId: string }
): ExportArtifactsBundle {
  const scopeQueries = artifacts.filter((a) => a.kind === 'scope_query');

  function lastOf(items: LlmArtifact[]): LlmArtifact | undefined {
    return items.length > 0 ? items[items.length - 1] : undefined;
  }

  if (scope.kind === 'section') {
    const sectionScope = {
      kind: 'section' as const,
      domain: scope.domain,
      sectionKey: scope.sectionKey,
    };
    return {
      sectionSummary: lastOf(
        getArtifactsForScope(artifacts, sectionScope, 'section_summary')
      ),
      scopeQueries: scopeQueries.filter((a) => scopeMatches(a, sectionScope)),
    };
  }

  if (scope.kind === 'domain') {
    const domainScope = { kind: 'domain' as const, domain: scope.domain };
    return {
      domainSynthesis: lastOf(
        getArtifactsForScope(artifacts, domainScope, 'domain_synthesis')
      ),
      scopeQueries: scopeQueries.filter(
        (a) =>
          scopeMatches(a, domainScope) ||
          (a.scope.kind === 'section' && a.scope.domain === scope.domain)
      ),
    };
  }

  return { scopeQueries: [] };
}
