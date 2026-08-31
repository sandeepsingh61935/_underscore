/**
 * @file related-tags.ts
 * @description Jaccard co-occurrence ranking for related tags.
 */

import { isStoplistTag } from './stoplist';
import type { RelatednessIndex, RelatedTagResult } from './types';

const DEFAULT_LIMIT = 5;
/** Tags applied to more than half the library are too generic to suggest. */
const ULTRA_COMMON_DF_RATIO = 0.5;
/** Gate: active tag must appear on at least this many highlights. */
const MIN_QUERY_DF = 2;
/** Keep candidates with meaningful overlap (match offline POC). */
const MIN_COOCCUR = 2;
const MIN_JACCARD = 0.15;

/**
 * Related tags for a single active filter tag.
 * Returns [] when gated (df < 2) or no eligible co-tags.
 */
export function relatedTags(
  index: RelatednessIndex,
  tagName: string,
  limit: number = DEFAULT_LIMIT
): RelatedTagResult[] {
  const tag = tagName.trim().toLowerCase();
  if (!tag) return [];

  const seedIds = index.tagToIds.get(tag);
  const tagDf = seedIds?.size ?? index.tagDf.get(tag) ?? 0;
  if (tagDf < MIN_QUERY_DF || !seedIds || seedIds.size === 0) {
    return [];
  }

  const pair = new Map<string, number>();
  for (const id of seedIds) {
    const docIdx = index.idToIndex.get(id);
    if (docIdx === undefined) continue;
    const doc = index.docs[docIdx];
    if (!doc) continue;
    for (const other of doc.tags) {
      if (other === tag) continue;
      if (isStoplistTag(other)) continue;
      const dfB = index.tagDf.get(other) ?? 0;
      if (index.N > 0 && dfB / index.N > ULTRA_COMMON_DF_RATIO) continue;
      pair.set(other, (pair.get(other) ?? 0) + 1);
    }
  }

  const ranked: RelatedTagResult[] = [];
  for (const [other, c] of pair) {
    const dfB = index.tagDf.get(other) ?? 1;
    const union = tagDf + dfB - c;
    const jaccard = union > 0 ? c / union : 0;
    if (c < MIN_COOCCUR && jaccard < MIN_JACCARD) continue;
    ranked.push({ tag: other, cooccur: c, score: jaccard });
  }

  ranked.sort(
    (a, b) => b.score - a.score || b.cooccur - a.cooccur || a.tag.localeCompare(b.tag)
  );
  return ranked.slice(0, Math.max(0, limit));
}
