/**
 * @file highlight-metadata.ts
 * @description Normalize user-authored highlight notes and tags before persistence.
 */

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
}

export function buildHighlightMetadataUpdate(
  input: HighlightMetadataInput,
): { source: 'user'; notes?: string; tags?: string[] } | undefined {
  const notes = input.notes !== undefined ? sanitizeHighlightNote(input.notes) : undefined;
  const tags = input.tags !== undefined ? normalizeHighlightTags(input.tags) : undefined;

  if (!notes && (!tags || tags.length === 0)) {
    return undefined;
  }

  return {
    source: 'user',
    ...(notes ? { notes } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
}
