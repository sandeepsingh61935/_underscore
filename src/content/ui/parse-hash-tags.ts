/**
 * @file parse-hash-tags.ts
 * @description Parse `#word` tags from the selection annotation bar tags box.
 */

import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

const HASH_TAG = /#([A-Za-z0-9_-]+)/g;

export function parseHashTags(text: string): string[] {
  return [...text.matchAll(HASH_TAG)].map((match) => match[1] ?? '').filter(Boolean);
}

export type TagBoxAction = { type: 'noop' } | { type: 'replace'; tags: string[] };

/** Empty box clears tags. Prose with no #word does not. */
export function tagBoxAction(text: string): TagBoxAction {
  if (text.trim() === '') return { type: 'replace', tags: [] };
  const raw = parseHashTags(text);
  if (raw.length === 0) return { type: 'noop' };
  return { type: 'replace', tags: normalizeHighlightTags(raw) };
}
