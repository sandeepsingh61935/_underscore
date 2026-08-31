/**
 * @file toRelatednessDoc.ts
 * @description Map web library highlight DTOs into relatedness index docs.
 */

import type { RelatednessDoc } from '@/shared/relatedness';
import {
  toRelatednessDoc as toDoc,
  toRelatednessDocs as toDocs,
} from '@/shared/relatedness/to-relatedness-doc';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

/** Stable URL for same-page / same-domain signals (matches Library search shape). */
export function webHighlightUrl(h: Pick<WebHighlight, 'domain' | 'path'>): string {
  const path = h.path?.startsWith('/') ? h.path : h.path ? `/${h.path}` : '/';
  return `https://${h.domain}${path}`;
}

export function toRelatednessDoc(h: WebHighlight): RelatednessDoc {
  return toDoc({
    id: h.id,
    quote: h.quote,
    note: h.note,
    domain: h.domain,
    path: h.path,
    tags: h.tags,
    encrypted: h.encrypted,
  });
}

export function toRelatednessDocs(rows: readonly WebHighlight[]): RelatednessDoc[] {
  return toDocs(
    rows.map((h) => ({
      id: h.id,
      quote: h.quote,
      note: h.note,
      domain: h.domain,
      path: h.path,
      tags: h.tags,
      encrypted: h.encrypted,
    }))
  );
}
