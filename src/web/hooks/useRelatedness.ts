/**
 * @file useRelatedness.ts
 * @description Session relatedness index + thin query hooks for web library.
 */

import { useMemo } from 'react';

import {
  RelatednessQueryService,
  type RelatedHighlightResult,
  type RelatedTagResult,
} from '@/shared/relatedness';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';
import { toRelatednessDocs } from '@/web/lib/toRelatednessDoc';

/**
 * Build/rebuild the in-memory relatedness service when library rows change.
 * Cheap for repeated filter/detail opens within a session.
 */
export function useRelatednessService(
  highlights: readonly WebHighlight[]
): RelatednessQueryService {
  return useMemo(() => {
    return new RelatednessQueryService(toRelatednessDocs(highlights));
  }, [highlights]);
}

/**
 * Related tags for a single active tag filter. Empty when gated or multi-tag.
 */
export function useRelatedTags(
  service: RelatednessQueryService,
  tagFilters: readonly string[]
): RelatedTagResult[] {
  return useMemo(() => {
    if (tagFilters.length !== 1) return [];
    const tag = tagFilters[0]?.trim();
    if (!tag) return [];
    return service.relatedTags(tag);
  }, [service, tagFilters]);
}

/**
 * Related highlights for a seed id on highlight detail. Empty when unknown/no hits.
 */
export function useRelatedHighlights(
  service: RelatednessQueryService,
  highlightId: string | null | undefined
): RelatedHighlightResult[] {
  return useMemo(() => {
    if (!highlightId) return [];
    return service.relatedHighlights(highlightId);
  }, [service, highlightId]);
}
