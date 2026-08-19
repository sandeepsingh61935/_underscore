/**
 * @file related-highlights.ts
 * @description Hybrid related-highlight ranking (tags + BM25 + URL/domain).
 */

import type {
  RelatedHighlightReason,
  RelatedHighlightResult,
  RelatednessDoc,
  RelatednessIndex,
} from './types';

const DEFAULT_LIMIT = 5;
const MAX_PER_URL = 2;

const W_TAG = 0.55;
const W_TEXT = 0.35;
const W_URL = 0.08;
const W_DOMAIN = 0.02;

/** Minimum normalized BM25 to count as "Similar text" in reason pills. */
const TEXT_REASON_FLOOR = 0.05;

function tagIdf(index: RelatednessIndex): Map<string, number> {
  const idf = new Map<string, number>();
  const N = Math.max(index.N, 1);
  for (const [t, n] of index.tagDf) {
    idf.set(t, Math.log(1 + N / Math.max(n, 1)));
  }
  return idf;
}

function weightedJaccard(
  a: RelatednessDoc,
  b: RelatednessDoc,
  idf: Map<string, number>,
): number {
  const A = new Set(a.tags);
  const B = new Set(b.tags);
  if (A.size === 0 && B.size === 0) return 0;

  let inter = 0;
  let union = 0;
  for (const t of new Set([...A, ...B])) {
    const w = idf.get(t) ?? 1;
    union += w;
    if (A.has(t) && B.has(t)) inter += w;
  }
  return union > 0 ? inter / union : 0;
}

function buildReason(signals: {
  sameUrl: boolean;
  sharedTags: boolean;
  similarText: boolean;
}): RelatedHighlightReason {
  const parts: string[] = [];
  if (signals.sameUrl) parts.push('Same page');
  if (signals.sharedTags) parts.push('Shared tags');
  if (signals.similarText) parts.push('Similar text');
  if (parts.length === 0) {
    // Fallback — should be rare once score > 0 (domain-only boost).
    return 'Similar text';
  }
  return parts.join(' · ') as RelatedHighlightReason;
}

/**
 * Top related highlights for a seed id. Self excluded; max 2 per URL; score > 0.
 */
export function relatedHighlights(
  index: RelatednessIndex,
  highlightId: string,
  limit: number = DEFAULT_LIMIT,
): RelatedHighlightResult[] {
  const seedIdx = index.idToIndex.get(highlightId);
  if (seedIdx === undefined) return [];
  const seed = index.docs[seedIdx];
  if (!seed) return [];

  const bm25 = index.bm25;
  const idf = tagIdf(index);
  const scored: Array<RelatedHighlightResult & { tagScore: number; textScore: number }> = [];

  for (let j = 0; j < index.docs.length; j++) {
    if (j === seedIdx) continue;
    const other = index.docs[j]!;
    const tag = weightedJaccard(seed, other, idf);
    const text = bm25.scoreNorm(seedIdx, j);
    const sameUrl = Boolean(seed.url && seed.url === other.url);
    const sameDomain = Boolean(seed.domain && seed.domain === other.domain);
    const score = W_TAG * tag + W_TEXT * text + W_URL * (sameUrl ? 1 : 0) + W_DOMAIN * (sameDomain ? 1 : 0);
    if (score <= 0) continue;

    const sharedTags = tag > 0;
    const similarText = text > TEXT_REASON_FLOOR;
    const signals = {
      sameUrl,
      sameDomain,
      sharedTags,
      similarText,
    };

    scored.push({
      id: other.id,
      score,
      reason: buildReason(signals),
      signals,
      tagScore: tag,
      textScore: text,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.tagScore - a.tagScore ||
      b.textScore - a.textScore ||
      a.id.localeCompare(b.id),
  );

  const out: RelatedHighlightResult[] = [];
  const perUrl = new Map<string, number>();

  for (const row of scored) {
    if (out.length >= limit) break;
    const doc = index.docs[index.idToIndex.get(row.id)!];
    const urlKey = doc?.url || `__id:${row.id}`;
    const used = perUrl.get(urlKey) ?? 0;
    if (used >= MAX_PER_URL) continue;
    perUrl.set(urlKey, used + 1);
    out.push({
      id: row.id,
      score: row.score,
      reason: row.reason,
      signals: row.signals,
    });
  }

  return out;
}
