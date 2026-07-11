/**
 * @file normalize.ts
 * @description Map repository records to export DTOs and filter by scope.
 */

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { getDomainFromUrl, urlMatchesDomain } from '@/shared/utils/domain-from-url';
import { getSectionKey } from '@/shared/utils/section-key';

import type { ExportableHighlight, ExportScope } from './types';

export function toExportableHighlight(
  hl: HighlightDataV2,
  decryptionStatus?: ExportableHighlight['decryptionStatus'],
): ExportableHighlight | null {
  if (!hl.url) return null;

  const domain = getDomainFromUrl(hl.url);
  if (!domain) return null;

  let path = '/';
  try {
    path = new URL(hl.url).pathname;
  } catch {
    return null;
  }

  const sectionKey = getSectionKey({ url: hl.url, path });

  return {
    id: hl.id,
    text: hl.text,
    url: hl.url,
    domain,
    sectionKey,
    colorRole: hl.colorRole,
    createdAt: hl.createdAt,
    tags: hl.metadata?.tags,
    note: hl.metadata?.notes,
    decryptionStatus,
  };
}

export function filterRawHighlightsByScope(
  highlights: HighlightDataV2[],
  scope: ExportScope,
): HighlightDataV2[] {
  switch (scope.kind) {
    case 'library':
      return highlights.filter((hl) => hl.url);
    case 'domain':
      return highlights.filter((hl) => hl.url && urlMatchesDomain(hl.url, scope.domain));
    case 'section':
      return highlights.filter((hl) => {
        if (!hl.url || !urlMatchesDomain(hl.url, scope.domain)) return false;
        let path = '/';
        try {
          path = new URL(hl.url).pathname;
        } catch {
          return false;
        }
        return getSectionKey({ url: hl.url, path }) === scope.sectionKey;
      });
    case 'highlight':
      return highlights.filter((hl) => hl.id === scope.highlightId);
  }
}

export function filterExportableByScope(
  highlights: ExportableHighlight[],
  scope: ExportScope,
): ExportableHighlight[] {
  switch (scope.kind) {
    case 'library':
      return highlights;
    case 'domain':
      return highlights.filter((h) => h.domain === scope.domain);
    case 'section':
      return highlights.filter(
        (h) => h.domain === scope.domain && h.sectionKey === scope.sectionKey,
      );
    case 'highlight':
      return highlights.filter((h) => h.id === scope.highlightId);
  }
}

export function partitionExportable(highlights: ExportableHighlight[]): {
  included: ExportableHighlight[];
  omitted: number;
} {
  const included = highlights.filter(
    (h) =>
      h.text.trim().length > 0
      && h.decryptionStatus !== 'vault_locked'
      && h.decryptionStatus !== 'failed',
  );
  return { included, omitted: highlights.length - included.length };
}
