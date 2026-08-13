/**
 * Cloud `highlights` row → domain fields.
 *
 * Tags: junction/label names when present; otherwise `metadata.tags`.
 * Encrypted bodies stay opaque (empty text + encrypted flag). Never invent plaintext.
 * Basic / local IDB shapes are out of scope.
 */

import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

export function resolveCloudHighlightTags(
  junctionLabels?: readonly string[] | null,
  metadataTags?: readonly string[] | null,
): string[] {
  const junction = normalizeHighlightTags([...(junctionLabels ?? [])]);
  if (junction.length > 0) return junction;
  return normalizeHighlightTags([...(metadataTags ?? [])]);
}

export function mapCloudBodyText(row: {
  text?: unknown;
  text_encrypted?: unknown;
}): { text: string; encrypted: boolean } {
  if (typeof row.text === 'string' && row.text.length > 0) {
    return { text: row.text, encrypted: false };
  }
  if (row.text_encrypted != null && row.text_encrypted !== '') {
    return { text: '', encrypted: true };
  }
  return { text: typeof row.text === 'string' ? row.text : '', encrypted: false };
}
