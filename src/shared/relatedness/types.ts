/**
 * @file types.ts
 * @description Input/output types for library relatedness (tags + highlights).
 */

/** Minimal highlight shape for the in-memory relatedness index. */
export type RelatednessDoc = {
  id: string;
  text: string;
  notes: string;
  url: string;
  domain: string;
  /** Normalized lowercase tags. */
  tags: string[];
  /** When true, text/notes must not be BM25-tokenized as plaintext. */
  encrypted?: boolean;
};

export type RelatedTagResult = {
  tag: string;
  score: number;
  cooccur: number;
};

export type RelatedHighlightReason =
  | 'Same page'
  | 'Shared tags'
  | 'Similar text'
  | 'Same page · Shared tags'
  | 'Same page · Similar text'
  | 'Shared tags · Similar text'
  | 'Same page · Shared tags · Similar text';

export type RelatedPageReason =
  'Shared tags' | 'Similar text' | 'Shared tags · Similar text';

export type RelatedPageResult = {
  domain: string;
  section: string;
  score: number;
  highlightCount: number;
  reason: RelatedPageReason;
  signals: {
    sharedTags: boolean;
    similarText: boolean;
  };
};

export type RelatedHighlightResult = {
  id: string;
  score: number;
  reason: RelatedHighlightReason;
  /** Dominant signal flags used to build `reason`. */
  signals: {
    sameUrl: boolean;
    sameDomain: boolean;
    sharedTags: boolean;
    similarText: boolean;
  };
};

export type RelatednessBm25 = {
  /** Normalized score in [0, 1] for query doc i vs doc j. */
  scoreNorm: (queryIdx: number, docIdx: number) => number;
};

export type RelatednessIndex = {
  docs: RelatednessDoc[];
  /** tag → highlight ids that carry the tag */
  tagToIds: Map<string, Set<string>>;
  /** tag → document frequency */
  tagDf: Map<string, number>;
  idToIndex: Map<string, number>;
  N: number;
  /** Built once per index; used by related-highlight scoring. */
  bm25: RelatednessBm25;
};
