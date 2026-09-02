/**
 * @file relatedness-query-service.ts
 * @description Session-scoped query facade over an in-memory relatedness index.
 */

import { buildRelatednessIndex } from './build-relatedness-index';
import { relatedHighlights } from './related-highlights';
import { relatedPages } from './related-pages';
import { relatedTags } from './related-tags';
import type {
  RelatedHighlightResult,
  RelatednessDoc,
  RelatednessIndex,
  RelatedPageResult,
  RelatedTagResult,
} from './types';

export type RelatednessQueryServiceOptions = {
  tagLimit?: number;
  highlightLimit?: number;
  pageLimit?: number;
};

/**
 * Thin service: rebuild index when library rows change; query related tags/highlights.
 * UI must not own ranking — call through this (or pure helpers) only.
 */
export class RelatednessQueryService {
  private index: RelatednessIndex;
  private readonly tagLimit: number;
  private readonly highlightLimit: number;
  private readonly pageLimit: number;

  constructor(
    docs: readonly RelatednessDoc[] = [],
    opts: RelatednessQueryServiceOptions = {}
  ) {
    this.tagLimit = opts.tagLimit ?? 5;
    this.highlightLimit = opts.highlightLimit ?? 5;
    this.pageLimit = opts.pageLimit ?? 3;
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
    limit = this.highlightLimit
  ): RelatedHighlightResult[] {
    return relatedHighlights(this.index, highlightId, limit);
  }

  relatedPages(
    seedDomain: string,
    seedSection: string,
    limit = this.pageLimit
  ): RelatedPageResult[] {
    return relatedPages(this.index, seedDomain, seedSection, limit);
  }

  /** Lookup a doc already in the index (for UI snippets). */
  getDoc(id: string): RelatednessDoc | null {
    const idx = this.index.idToIndex.get(id);
    if (idx === undefined) return null;
    return this.index.docs[idx] ?? null;
  }
}
