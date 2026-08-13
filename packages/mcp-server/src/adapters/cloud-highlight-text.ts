export {
  DEPRECATED_HIGHLIGHT_COLUMNS,
  HIGHLIGHTS_CLOUD_COLUMNS,
  parseSelectColumns,
  REQUIRED_HIGHLIGHTS_MIGRATION_COLUMNS,
} from './highlights-schema-contract.js';

/** Parse highlight `text` column from Supabase (plaintext). */
export function displayTextFromCloudRow(raw: unknown): string {
  return String(raw ?? '');
}

/** Columns aligned with docs/06-security/highlights-schema.md */
export const HIGHLIGHTS_SELECT_COLUMNS =
  'id, url, text, color_role, selectors, content_hash, metadata, created_at, updated_at, deleted_at' as const;

/** Junction labels win; otherwise metadata.tags / legacy tags. Same rule as app mapper. */
export function resolveCloudTags(
  junctionLabels?: readonly string[] | null,
  metadataTags?: readonly string[] | null,
): string[] | undefined {
  const junction = (junctionLabels ?? []).map((t) => t.trim()).filter(Boolean);
  if (junction.length > 0) return [...junction];
  const meta = (metadataTags ?? []).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  return meta.length > 0 ? meta : undefined;
}

export function notesAndTagsFromCloudRow(
  row: Record<string, unknown>,
  junctionLabels?: readonly string[] | null,
): {
  notes?: string;
  tags?: string[];
} {
  const metadata = row.metadata as { notes?: string; tags?: string[] } | null | undefined;
  const metadataTags = metadata && typeof metadata === 'object' ? metadata.tags : undefined;
  const legacyTags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;
  const tags = resolveCloudTags(junctionLabels, metadataTags ?? legacyTags);
  if (metadata && typeof metadata === 'object') {
    return { notes: metadata.notes, tags };
  }

  const note = typeof row.note === 'string' ? row.note : undefined;
  return { notes: note, tags };
}
