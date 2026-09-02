/**
 * @file related-pages.ts
 * @description Page-as-seed related pages (cross-domain, max pair score).
 */

import { getSectionPath } from '@/shared/utils/normalize-page-url';

import type {
  RelatednessDoc,
  RelatednessIndex,
  RelatedPageReason,
  RelatedPageResult,
} from './types';

const DEFAULT_LIMIT = 3;

const W_TAG = 0.55;
const W_TEXT = 0.35;

/** Same floor as highlight relatedness reason pills. */
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
  idf: Map<string, number>
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

function pageSection(doc: RelatednessDoc): string {
  return getSectionPath(doc.url);
}

function pageKey(doc: RelatednessDoc): string {
  return `${doc.domain}\0${pageSection(doc)}`;
}

function buildReason(sharedTags: boolean, similarText: boolean): RelatedPageReason | null {
  if (sharedTags && similarText) return 'Shared tags · Similar text';
  if (sharedTags) return 'Shared tags';
  if (similarText) return 'Similar text';
  return null;
}

/**
 * Top related library pages for a seed domain+section.
 * Cross-domain only; current page excluded; page score = max pair; score > 0.
 */
export function relatedPages(
  index: RelatednessIndex,
  seedDomain: string,
  seedSection: string,
  limit: number = DEFAULT_LIMIT
): RelatedPageResult[] {
  const domain = seedDomain.trim();
  const section = seedSection.trim() || '/';
  if (!domain) return [];

  const seeds = index.docs.filter(
    (d) => d.domain === domain && pageSection(d) === section
  );
  if (seeds.length === 0) return [];

  const bm25 = index.bm25;
  const idf = tagIdf(index);
  const seedIdxs = seeds
    .map((s) => index.idToIndex.get(s.id))
    .filter((i): i is number => i !== undefined);

  type Acc = {
    domain: string;
    section: string;
    highlightCount: number;
    score: number;
    tagScore: number;
    textScore: number;
    sharedTags: boolean;
    similarText: boolean;
  };
  const byPage = new Map<string, Acc>();

  for (const other of index.docs) {
    if (!other.domain || other.domain === domain) continue;
    const otherIdx = index.idToIndex.get(other.id);
    if (otherIdx === undefined) continue;

    let best = 0;
    let bestTag = 0;
    let bestText = 0;
    for (const si of seedIdxs) {
      const seed = index.docs[si];
      if (!seed) continue;
      const tag = weightedJaccard(seed, other, idf);
      const text = bm25.scoreNorm(si, otherIdx);
      const score = W_TAG * tag + W_TEXT * text;
      if (score > best) {
        best = score;
        bestTag = tag;
        bestText = text;
      }
    }
    if (best <= 0) continue;

    const key = pageKey(other);
    const prev = byPage.get(key);
    if (!prev) {
      byPage.set(key, {
        domain: other.domain,
        section: pageSection(other),
        highlightCount: 1,
        score: best,
        tagScore: bestTag,
        textScore: bestText,
        sharedTags: bestTag > 0,
        similarText: bestText > TEXT_REASON_FLOOR,
      });
      continue;
    }
    prev.highlightCount += 1;
    if (best > prev.score) {
      prev.score = best;
      prev.tagScore = bestTag;
      prev.textScore = bestText;
      prev.sharedTags = bestTag > 0;
      prev.similarText = bestText > TEXT_REASON_FLOOR;
    }
  }

  const rows: RelatedPageResult[] = [];
  for (const acc of byPage.values()) {
    const reason = buildReason(acc.sharedTags, acc.similarText);
    if (!reason) continue;
    rows.push({
      domain: acc.domain,
      section: acc.section,
      score: acc.score,
      highlightCount: acc.highlightCount,
      reason,
      signals: {
        sharedTags: acc.sharedTags,
        similarText: acc.similarText,
      },
    });
  }

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.signals.sharedTags) - Number(a.signals.sharedTags) ||
      Number(b.signals.similarText) - Number(a.signals.similarText) ||
      a.domain.localeCompare(b.domain) ||
      a.section.localeCompare(b.section)
  );

  return rows.slice(0, Math.max(0, limit));
}
