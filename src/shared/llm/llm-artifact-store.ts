/**
 * @file llm-artifact-store.ts
 * @description Local persistence for LLM artifacts (extension + web).
 */

import { applySave, getArtifactsForScope } from '@/shared/llm/llm-artifact-service';
import type {
  LlmArtifact,
  LlmArtifactKind,
  LlmArtifactScope,
  SaveLlmArtifactInput,
} from '@/shared/schemas/llm-artifact-schema';
import { LlmArtifactSchema } from '@/shared/schemas/llm-artifact-schema';

const STORAGE_KEY = 'llm.artifacts';

async function readRaw(): Promise<LlmArtifact[]> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const raw = result[STORAGE_KEY];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => LlmArtifactSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => r.data);
  }

  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => LlmArtifactSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data);
    } catch {
      return [];
    }
  }

  return [];
}

async function writeRaw(artifacts: LlmArtifact[]): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: artifacts });
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
  }
}

export async function loadAllLlmArtifacts(): Promise<LlmArtifact[]> {
  return readRaw();
}

export async function saveLlmArtifact(input: SaveLlmArtifactInput): Promise<LlmArtifact> {
  const existing = await readRaw();
  const next = applySave(existing, input);
  const saved = next[next.length - 1]!;
  await writeRaw(next);
  return saved;
}

export async function getLlmArtifactsByScope(
  scope: LlmArtifactScope,
  kind?: LlmArtifactKind,
): Promise<LlmArtifact[]> {
  const all = await readRaw();
  return getArtifactsForScope(all, scope, kind);
}
