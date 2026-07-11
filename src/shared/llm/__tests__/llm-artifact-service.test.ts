import { describe, it, expect } from 'vitest';

import {
  applySave,
  getArtifactsForScope,
  isArtifactStale,
  SCOPE_QUERY_CAP,
  upsertArtifact,
} from '@/shared/llm/llm-artifact-service';
import type { LlmArtifact } from '@/shared/schemas/llm-artifact-schema';

function artifact(over: Partial<LlmArtifact> = {}): LlmArtifact {
  return {
    id: 'a-1',
    kind: 'section_summary',
    scope: { kind: 'section', domain: 'example.com', sectionKey: '/docs' },
    content: 'Summary text',
    highlightCountAtGeneration: 3,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

describe('llm-artifact-service', () => {
  it('replaces section_summary for the same scope on upsert', () => {
    const first = artifact({ id: 'old', content: 'v1' });
    const second = artifact({ id: 'new', content: 'v2' });
    const result = upsertArtifact([first], second);
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('v2');
  });

  it('appends scope_query entries and caps at ten per scope', () => {
    let store: LlmArtifact[] = [];
    for (let i = 0; i < SCOPE_QUERY_CAP + 2; i += 1) {
      store = upsertArtifact(store, artifact({
        id: `q-${i}`,
        kind: 'scope_query',
        question: `Q${i}`,
        content: `A${i}`,
      }));
    }
    const queries = getArtifactsForScope(store, {
      kind: 'section',
      domain: 'example.com',
      sectionKey: '/docs',
    }, 'scope_query');
    expect(queries).toHaveLength(SCOPE_QUERY_CAP);
    expect(queries[0]?.question).toBe('Q2');
    expect(queries[queries.length - 1]?.question).toBe(`Q${SCOPE_QUERY_CAP + 1}`);
  });

  it('marks artifact stale when highlight count changes', () => {
    expect(isArtifactStale(artifact({ highlightCountAtGeneration: 3 }), 3)).toBe(false);
    expect(isArtifactStale(artifact({ highlightCountAtGeneration: 3 }), 4)).toBe(true);
  });

  it('applySave builds a new artifact record', () => {
    const result = applySave([], {
      kind: 'domain_synthesis',
      scope: { kind: 'domain', domain: 'example.com' },
      content: 'Domain overview',
      highlightCountAtGeneration: 12,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('domain_synthesis');
    expect(result[0]?.content).toBe('Domain overview');
  });
});
