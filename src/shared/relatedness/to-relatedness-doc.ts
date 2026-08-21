/**
 * Map common highlight DTOs into relatedness index docs (popup + web).
 */
import type { RelatednessDoc } from './types';

export type RelatednessHighlightInput = {
  id: string;
  text?: string | null;
  quote?: string | null;
  notes?: string | null;
  note?: string | null;
  url?: string | null;
  domain?: string | null;
  path?: string | null;
  tags?: string[] | null;
  encrypted?: boolean;
};

function resolveUrl(h: RelatednessHighlightInput): string {
  if (h.url) return h.url;
  const domain = h.domain ?? 'local';
  const path = h.path?.startsWith('/')
    ? h.path
    : h.path
      ? `/${h.path}`
      : '/';
  return `https://${domain}${path}`;
}

export function toRelatednessDoc(h: RelatednessHighlightInput): RelatednessDoc {
  return {
    id: h.id,
    text: h.text ?? h.quote ?? '',
    notes: h.notes ?? h.note ?? '',
    url: resolveUrl(h),
    domain: h.domain ?? '',
    tags: Array.isArray(h.tags) ? h.tags : [],
    encrypted: h.encrypted === true,
  };
}

export function toRelatednessDocs(
  rows: readonly RelatednessHighlightInput[],
): RelatednessDoc[] {
  return rows.map(toRelatednessDoc);
}
