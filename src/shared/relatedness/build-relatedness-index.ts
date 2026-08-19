/**
 * @file build-relatedness-index.ts
 * @description Build a session relatedness index from library highlight DTOs.
 */

import { buildBm25 } from './bm25';
import type { RelatednessDoc, RelatednessIndex } from './types';

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Normalize docs and build inverted tag → id maps.
 * Tags are lowercased; empty ids are dropped.
 */
export function buildRelatednessIndex(input: readonly RelatednessDoc[]): RelatednessIndex {
  const docs: RelatednessDoc[] = [];
  const tagToIds = new Map<string, Set<string>>();
  const tagDf = new Map<string, number>();
  const idToIndex = new Map<string, number>();

  for (const raw of input) {
    if (!raw?.id) continue;
    const tags = [
      ...new Set(
        (raw.tags ?? [])
          .map(normalizeTag)
          .filter((t) => t.length > 0),
      ),
    ].sort();

    const doc: RelatednessDoc = {
      id: String(raw.id),
      text: typeof raw.text === 'string' ? raw.text : '',
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      url: typeof raw.url === 'string' ? raw.url : '',
      domain: typeof raw.domain === 'string' ? raw.domain : '',
      tags,
      encrypted: raw.encrypted === true,
    };

    idToIndex.set(doc.id, docs.length);
    docs.push(doc);

    for (const t of tags) {
      let set = tagToIds.get(t);
      if (!set) {
        set = new Set();
        tagToIds.set(t, set);
      }
      if (!set.has(doc.id)) {
        set.add(doc.id);
        tagDf.set(t, (tagDf.get(t) ?? 0) + 1);
      }
    }
  }

  return {
    docs,
    tagToIds,
    tagDf,
    idToIndex,
    N: docs.length,
    bm25: buildBm25(docs),
  };
}
