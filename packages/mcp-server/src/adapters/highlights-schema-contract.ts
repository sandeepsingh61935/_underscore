/**
 * Canonical highlights schema contract for MCP cloud adapter.
 * Keep in sync with docs/06-security/highlights-schema.md and
 * supabase/migrations/20260711170000_highlights_metadata_and_schema_align.sql
 */

/** Full `public.highlights` columns per highlights-schema.md */
export const HIGHLIGHTS_CLOUD_COLUMNS = [
  'id',
  'user_id',
  'url',
  'text',
  'color_role',
  'selectors',
  'content_hash',
  'metadata',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

/** Top-level columns that must not appear in SELECT lists (use metadata JSONB instead) */
export const DEPRECATED_HIGHLIGHT_COLUMNS = [
  'text_encrypted',
  'note',
  'notes',
  'tags',
] as const;

/** Columns ensured by 20260711170000_highlights_metadata_and_schema_align.sql */
export const REQUIRED_HIGHLIGHTS_MIGRATION_COLUMNS = [
  'metadata',
  'color_role',
  'selectors',
  'content_hash',
  'deleted_at',
] as const;

export function parseSelectColumns(select: string): readonly string[] {
  return select.split(',').map((column) => column.trim()).filter(Boolean);
}
