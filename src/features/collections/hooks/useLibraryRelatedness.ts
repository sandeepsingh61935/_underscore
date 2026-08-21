/**
 * Session relatedness index for extension library views.
 */
import { useMemo } from 'react';

import {
  RelatednessQueryService,
  type RelatedHighlightResult,
  type RelatedTagResult,
} from '@/shared/relatedness';
import {
  toRelatednessDocs,
  type RelatednessHighlightInput,
} from '@/shared/relatedness/to-relatedness-doc';

export function useLibraryRelatednessService(
  highlights: readonly RelatednessHighlightInput[],
): RelatednessQueryService {
  return useMemo(() => {
    return new RelatednessQueryService(toRelatednessDocs(highlights));
  }, [highlights]);
}

export function useRelatedTags(
  service: RelatednessQueryService,
  tagFilters: readonly string[],
): RelatedTagResult[] {
  return useMemo(() => {
    if (tagFilters.length !== 1) return [];
    const tag = tagFilters[0]?.trim();
    if (!tag) return [];
    return service.relatedTags(tag);
  }, [service, tagFilters]);
}

export function useRelatedHighlights(
  service: RelatednessQueryService,
  highlightId: string | null | undefined,
): RelatedHighlightResult[] {
  return useMemo(() => {
    if (!highlightId) return [];
    return service.relatedHighlights(highlightId);
  }, [service, highlightId]);
}
