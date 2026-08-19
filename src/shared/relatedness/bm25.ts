/**
 * @file bm25.ts
 * @description Tiny in-memory BM25 over relatedness docs (POC-parity).
 */

import { readableCorpusText, tokenize } from './tokenize';
import type { RelatednessDoc } from './types';

const K1 = 1.4;
const B = 0.75;

type DocTf = { tf: Map<string, number>; len: number };

export type Bm25Index = {
  /** Normalized score in [0, 1] for query doc i vs doc j. */
  scoreNorm: (queryIdx: number, docIdx: number) => number;
};

/**
 * Build BM25 over docs. Encrypted/unreadable bodies tokenize as empty.
 * Scores are normalized by the corpus max pairwise score (POC parity).
 */
export function buildBm25(docs: readonly RelatednessDoc[]): Bm25Index {
  const N = docs.length;
  const tfs: DocTf[] = [];
  const df = new Map<string, number>();
  let totalLen = 0;

  for (const d of docs) {
    const tokens = tokenize(readableCorpusText(d));
    totalLen += tokens.length;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    tfs.push({ tf, len: tokens.length });
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const avgdl = totalLen / Math.max(N, 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) {
    idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  }

  function score(queryIdx: number, docIdx: number): number {
    if (queryIdx === docIdx) return 0;
    const q = tfs[queryIdx];
    const d = tfs[docIdx];
    if (!q || !d || q.tf.size === 0 || d.tf.size === 0) return 0;

    let s = 0;
    for (const [t, qf] of q.tf) {
      const f = d.tf.get(t);
      if (!f) continue;
      const idfT = idf.get(t) ?? 0;
      const denom = f + K1 * (1 - B + (B * d.len) / avgdl);
      s += idfT * ((f * (K1 + 1)) / denom) * Math.min(qf, 3);
    }
    return s;
  }

  let max = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      max = Math.max(max, score(i, j));
    }
  }

  return {
    scoreNorm(i: number, j: number): number {
      const s = score(i, j);
      return max > 0 ? s / max : 0;
    },
  };
}
