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
  metadataTags?: readonly string[] | null
): string[] {
  const junction = normalizeHighlightTags([...(junctionLabels ?? [])]);
  if (junction.length > 0) return junction;
  return normalizeHighlightTags([...(metadataTags ?? [])]);
}

/** ADR-013 ciphertext envelopes live in `text` as `[ADR013:...]`. */
export function isEncryptedHighlightText(text: string): boolean {
  const t = text.trim();
  return t.startsWith('[ADR013:') || t.startsWith('[ADR013');
}

export function mapCloudBodyText(row: { text?: unknown; text_encrypted?: unknown }): {
  text: string;
  encrypted: boolean;
} {
  if (typeof row.text === 'string' && row.text.length > 0) {
    if (isEncryptedHighlightText(row.text)) {
      // Never surface ciphertext as English for BM25 / UI quote paths.
      return { text: '', encrypted: true };
    }
    return { text: row.text, encrypted: false };
  }
  // Legacy / alternate shapes only — production schema has no text_encrypted column.
  if (row.text_encrypted != null && row.text_encrypted !== '') {
    return { text: '', encrypted: true };
  }
  return { text: typeof row.text === 'string' ? row.text : '', encrypted: false };
}
