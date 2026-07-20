/**
 * @file highlight-metadata.ts
 * @description Normalize user-authored highlight notes, tags, and presentation.
 */

import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { HIGHLIGHT_PRESENTATION_FORMATS } from '@/shared/utils/highlight-presentation';

export const HIGHLIGHT_NOTE_MAX_LENGTH = 2000;
export const HIGHLIGHT_TAG_MAX_LENGTH = 32;
export const HIGHLIGHT_MAX_TAGS = 10;

export function normalizeHighlightTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().slice(0, HIGHLIGHT_TAG_MAX_LENGTH);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= HIGHLIGHT_MAX_TAGS) break;
  }

  return result;
}

export function sanitizeHighlightNote(note: string): string {
  return note.trim().slice(0, HIGHLIGHT_NOTE_MAX_LENGTH);
}

export interface HighlightMetadataInput {
  notes?: string;
  tags?: string[];
  /** Set presentation; pass null to clear user presentation. */
  presentation?: HighlightPresentation | null;
}

export type HighlightStoredMetadata = {
  source: 'user' | 'sync';
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
};

export function normalizePresentation(
  input: HighlightPresentation | null | undefined,
): HighlightPresentation | undefined {
  if (input == null) return undefined;
  if (!HIGHLIGHT_PRESENTATION_FORMATS.includes(input.format)) return undefined;
  const language =
    typeof input.language === 'string' && input.language.trim()
      ? input.language.trim().slice(0, 32).toLowerCase()
      : undefined;
  return {
    format: input.format,
    ...(language ? { language } : {}),
  };
}

/** Union junction labels with legacy metadata.tags during migration cutover. */
export function mergeHighlightLabels(
  junctionLabels?: string[],
  metadataTags?: string[],
): string[] | undefined {
  const merged = normalizeHighlightTags([...(junctionLabels ?? []), ...(metadataTags ?? [])]);
  return merged.length > 0 ? merged : undefined;
}

export function buildHighlightMetadataUpdate(
  input: HighlightMetadataInput,
): HighlightStoredMetadata | undefined {
  const notes = input.notes !== undefined ? sanitizeHighlightNote(input.notes) : undefined;
  const tags = input.tags !== undefined ? normalizeHighlightTags(input.tags) : undefined;
  const presentation =
    input.presentation !== undefined ? normalizePresentation(input.presentation) : undefined;

  if (
    !notes &&
    (!tags || tags.length === 0) &&
    presentation === undefined &&
    input.presentation !== null
  ) {
    return undefined;
  }

  return {
    source: 'user',
    ...(notes ? { notes } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(presentation ? { presentation } : {}),
  };
}

/**
 * Merge a partial notes/tags/presentation patch onto existing metadata without
 * wiping unrelated fields. Empty notes clear notes; empty tags clear tags;
 * presentation null clears user presentation.
 */
export function mergeHighlightMetadataPatch(
  existing: HighlightStoredMetadata | null | undefined,
  input: HighlightMetadataInput,
): HighlightStoredMetadata {
  const notes =
    input.notes !== undefined
      ? sanitizeHighlightNote(input.notes)
      : (existing?.notes ?? '');
  const tags =
    input.tags !== undefined
      ? normalizeHighlightTags(input.tags)
      : normalizeHighlightTags(existing?.tags ?? []);

  let presentation = existing?.presentation;
  if (input.presentation !== undefined) {
    presentation = normalizePresentation(input.presentation);
  }

  return {
    source: 'user',
    ...(notes ? { notes } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(existing?.sourceKind === 'code' ? { sourceKind: 'code' as const } : {}),
    ...(existing?.language ? { language: existing.language } : {}),
    ...(presentation ? { presentation } : {}),
  };
}
