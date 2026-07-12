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

export function notesAndTagsFromCloudRow(row: Record<string, unknown>): {
  notes?: string;
  tags?: string[];
} {
  const metadata = row.metadata as { notes?: string; tags?: string[] } | null | undefined;
  if (metadata && typeof metadata === 'object') {
    return { notes: metadata.notes, tags: metadata.tags };
  }

  const note = typeof row.note === 'string' ? row.note : undefined;
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;

  return { notes: note, tags };
}
