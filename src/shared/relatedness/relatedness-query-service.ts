/**
 * @file relatedness-query-service.ts
 * @description Session-scoped query facade over an in-memory relatedness index.
 */

import { buildRelatednessIndex } from './build-relatedness-index';
import { relatedHighlights } from './related-highlights';
import { relatedTags } from './related-tags';
import type {
  RelatedHighlightResult,
  RelatednessDoc,
  RelatednessIndex,
  RelatedTagResult,
} from './types';

export type RelatednessQueryServiceOptions = {
  tagLimit?: number;
  highlightLimit?: number;
};

/**
 * Thin service: rebuild index when library rows change; query related tags/highlights.
 * UI must not own ranking — call through this (or pure helpers) only.
 */
export class RelatednessQueryService {
  private index: RelatednessIndex;
  private readonly tagLimit: number;
  private readonly highlightLimit: number;

  constructor(
    docs: readonly RelatednessDoc[] = [],
    opts: RelatednessQueryServiceOptions = {},
  ) {
    this.tagLimit = opts.tagLimit ?? 5;
    this.highlightLimit = opts.highlightLimit ?? 5;
    this.index = buildRelatednessIndex(docs);
  }

  /** Replace the session index (library load/refresh). */
  rebuild(docs: readonly RelatednessDoc[]): void {
    this.index = buildRelatednessIndex(docs);
  }

  get size(): number {
    return this.index.N;
  }

  /** Document frequency for a tag (0 if unknown). */
  tagDf(tagName: string): number {
    const tag = tagName.trim().toLowerCase();
    return this.index.tagDf.get(tag) ?? 0;
  }

  relatedTags(tagName: string, limit = this.tagLimit): RelatedTagResult[] {
    return relatedTags(this.index, tagName, limit);
  }

  relatedHighlights(
    highlightId: string,
    limit = this.highlightLimit,
  ): RelatedHighlightResult[] {
    return relatedHighlights(this.index, highlightId, limit);
  }

  /** Lookup a doc already in the index (for UI snippets). */
  getDoc(id: string): RelatednessDoc | null {
    const idx = this.index.idToIndex.get(id);
    if (idx === undefined) return null;
    return this.index.docs[idx] ?? null;
  }
}
