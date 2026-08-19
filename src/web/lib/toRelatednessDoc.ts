/**
 * @file toRelatednessDoc.ts
 * @description Map web library highlight DTOs into relatedness index docs.
 */

import type { RelatednessDoc } from '@/shared/relatedness';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

/** Stable URL for same-page / same-domain signals (matches Library search shape). */
export function webHighlightUrl(h: Pick<WebHighlight, 'domain' | 'path'>): string {
  const path = h.path?.startsWith('/') ? h.path : h.path ? `/${h.path}` : '/';
  return `https://${h.domain}${path}`;
}

export function toRelatednessDoc(h: WebHighlight): RelatednessDoc {
  return {
    id: h.id,
    text: h.quote ?? '',
    notes: h.note ?? '',
    url: webHighlightUrl(h),
    domain: h.domain ?? '',
    tags: Array.isArray(h.tags) ? h.tags : [],
    encrypted: h.encrypted === true,
  };
}

export function toRelatednessDocs(rows: readonly WebHighlight[]): RelatednessDoc[] {
  return rows.map(toRelatednessDoc);
}
