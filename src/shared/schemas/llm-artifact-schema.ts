/**
 * @file llm-artifact-schema.ts
 * @description Persisted LLM outputs (section summary, domain synthesis, scope Q&A).
 */

import { z } from 'zod';

export const LlmArtifactKindSchema = z.enum([
  'section_summary',
  'domain_synthesis',
  'scope_query',
]);

export type LlmArtifactKind = z.infer<typeof LlmArtifactKindSchema>;

export const LlmArtifactScopeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('section'),
    domain: z.string(),
    sectionKey: z.string(),
  }),
  z.object({
    kind: z.literal('domain'),
    domain: z.string(),
  }),
]);

export type LlmArtifactScope = z.infer<typeof LlmArtifactScopeSchema>;

export const LlmArtifactSchema = z.object({
  id: z.string(),
  kind: LlmArtifactKindSchema,
  scope: LlmArtifactScopeSchema,
  content: z.string(),
  question: z.string().optional(),
  highlightCountAtGeneration: z.number().int().nonnegative(),
  provider: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LlmArtifact = z.infer<typeof LlmArtifactSchema>;

export interface SaveLlmArtifactInput {
  kind: LlmArtifactKind;
  scope: LlmArtifactScope;
  content: string;
  question?: string;
  highlightCountAtGeneration: number;
  provider?: string;
}
