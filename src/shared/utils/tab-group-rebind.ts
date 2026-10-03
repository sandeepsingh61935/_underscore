/**
 * @file tab-group-rebind.ts
 * @description Heuristic for re-associating persisted tab group bindings with
 * live browser tab groups after browser restart, window close, or downtime.
 */

import type {
  LiveBrowserGroupCandidate,
  RebindMatch,
  RebindResult,
  TabGroupBinding,
} from '@/shared/types/page-group';

export type { LiveBrowserGroupCandidate, RebindMatch, RebindResult, TabGroupBinding };

export interface CandidateScore {
  score: number;
  jaccardOverlap: number;
  eligible: boolean;
  titleMatch: boolean;
  colorMatch: boolean;
}

/**
 * Computes the Jaccard similarity coefficient between two sets of normalized URLs.
 * Returns 0 if both arrays are empty. Otherwise returns |A ∩ B| / |A ∪ B|.
 */
export function jaccardSimilarity(
  urlsA: readonly string[],
  urlsB: readonly string[]
): number {
  const setA = new Set(urlsA ?? []);
  const setB = new Set(urlsB ?? []);

  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  let intersectionCount = 0;
  for (const url of setA) {
    if (setB.has(url)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  if (unionSize === 0) {
    return 0;
  }

  return intersectionCount / unionSize;
}

/**
 * Scores a live browser tab group candidate against a stored tab group binding.
 *
 * Scoring:
 * - titleMatch: +2
 * - colorMatch: +1
 * - Jaccard URL overlap: +overlap (0 to 1)
 *
 * Eligibility:
 * - (titleMatch && overlap >= 0.5) || overlap >= 0.8
 */
export function scoreCandidate(
  binding: TabGroupBinding,
  candidate: LiveBrowserGroupCandidate
): CandidateScore {
  const bindingTitle = (binding.title ?? '').trim().toLowerCase();
  const candidateTitle = (candidate.title ?? '').trim().toLowerCase();
  const titleMatch = bindingTitle === candidateTitle;

  const colorMatch = binding.color === candidate.color;
  const overlap = jaccardSimilarity(binding.urls ?? [], candidate.urls ?? []);

  const score = (titleMatch ? 2 : 0) + (colorMatch ? 1 : 0) + overlap;
  const eligible = (titleMatch && overlap >= 0.5) || overlap >= 0.8;

  return {
    score,
    jaccardOverlap: overlap,
    eligible,
    titleMatch,
    colorMatch,
  };
}

/**
 * Rebinds persisted tab group bindings to live browser tab groups.
 *
 * Algorithm:
 * 1. Compute scores for all eligible (binding, candidate) pairs.
 * 2. Sort pairs descending by score, tiebroken by Jaccard overlap descending.
 * 3. Greedily assign one-to-one matches.
 * 4. Partition unmatched bindings and candidates.
 */
export function rebind(
  bindings: readonly TabGroupBinding[],
  liveGroups: readonly LiveBrowserGroupCandidate[]
): RebindResult {
  interface ScoredPair {
    binding: TabGroupBinding;
    candidate: LiveBrowserGroupCandidate;
    score: number;
    jaccardOverlap: number;
  }

  const eligiblePairs: ScoredPair[] = [];

  for (const binding of bindings) {
    for (const candidate of liveGroups) {
      const evaluation = scoreCandidate(binding, candidate);
      if (evaluation.eligible) {
        eligiblePairs.push({
          binding,
          candidate,
          score: evaluation.score,
          jaccardOverlap: evaluation.jaccardOverlap,
        });
      }
    }
  }

  // Sort descending by score, then by jaccardOverlap descending
  eligiblePairs.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.jaccardOverlap - a.jaccardOverlap;
  });

  const matchedBindings = new Set<TabGroupBinding>();
  const matchedCandidateKeys = new Set<number>();
  const matchedBindingKeys = new Set<string>();
  const matches: RebindMatch[] = [];

  for (const pair of eligiblePairs) {
    if (
      !matchedBindings.has(pair.binding) &&
      !matchedBindingKeys.has(pair.binding.appGroupId) &&
      !matchedCandidateKeys.has(pair.candidate.browserGroupId)
    ) {
      matchedBindings.add(pair.binding);
      matchedBindingKeys.add(pair.binding.appGroupId);
      matchedCandidateKeys.add(pair.candidate.browserGroupId);
      matches.push({
        binding: pair.binding,
        candidate: pair.candidate,
        score: pair.score,
        jaccardOverlap: pair.jaccardOverlap,
      });
    }
  }

  const unmatchedBindings = bindings.filter(
    (b) => !matchedBindings.has(b) && !matchedBindingKeys.has(b.appGroupId)
  );
  const unmatchedCandidates = liveGroups.filter(
    (c) => !matchedCandidateKeys.has(c.browserGroupId)
  );

  return {
    matches,
    unmatchedBindings,
    unmatchedCandidates,
  };
}
