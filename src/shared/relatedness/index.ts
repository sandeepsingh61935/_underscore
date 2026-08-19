/**
 * @file index.ts
 * @description Public exports for library relatedness.
 */

export { buildRelatednessIndex } from './build-relatedness-index';
export { relatedTags } from './related-tags';
export { relatedHighlights } from './related-highlights';
export { RelatednessQueryService } from './relatedness-query-service';
export { RELATED_TAG_STOPLIST, isStoplistTag } from './stoplist';
export type {
  RelatednessDoc,
  RelatednessIndex,
  RelatedTagResult,
  RelatedHighlightResult,
  RelatedHighlightReason,
} from './types';
