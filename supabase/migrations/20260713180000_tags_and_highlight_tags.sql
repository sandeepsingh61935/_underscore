-- Add normalized per-user tag library (public.tags + public.highlight_tags).
-- Backend for the Phase 3 step of the MarginaliaStrip/tag-library plan
-- (.cursor/plans/canvas_marginaliastrip_implementation_e1eddfb9.plan.md).
--
-- Today, tag names live only as a JSONB string array at
-- highlights.metadata->'tags' (see 20260711170000_highlights_metadata_and_schema_align.sql
-- and docs/06-security/highlights-schema.md). This migration introduces a
-- normalized tags table plus a highlight_tags junction table so tag names
-- can be deduplicated per user, autocompleted, and queried efficiently.
--
-- highlights.metadata is left untouched by this migration: metadata.notes
-- keeps living on the highlight row, and metadata.tags is intentionally
-- NOT removed or cleared here. It remains as a read fallback until the
-- application read paths cut over to the junction table (see Phase 4 of
-- the plan). A later migration will drop metadata.tags once the app-level
-- transition is verified in production.

-- ---------------------------------------------------------------------------
-- 1. public.tags — normalized per-user tag library.
-- ---------------------------------------------------------------------------

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  -- Mirrors the app-level normalization applied by normalizeHighlightTags()
  -- in src/shared/utils/highlight-metadata.ts: tag names are lowercased,
  -- trimmed, non-empty, and capped at HIGHLIGHT_TAG_MAX_LENGTH (32 chars).
  -- The 10-tags-per-highlight cap (HIGHLIGHT_MAX_TAGS) is an app-level
  -- concern enforced when writing highlight_tags rows, not a per-tag
  -- constraint, so it is not represented here.
  CONSTRAINT tags_name_normalized_chk CHECK (
    name = lower(trim(name))
    AND length(name) > 0
    AND length(name) <= 32
  )
);

COMMENT ON TABLE public.tags IS
  'Normalized per-user tag library. Replaces ad-hoc tag strings previously '
  'stored only in highlights.metadata->''tags'' JSONB arrays. Names are '
  'lowercase, trimmed, non-empty, max 32 chars, and unique per user '
  '(mirrors normalizeHighlightTags() in src/shared/utils/highlight-metadata.ts). '
  'See supabase/migrations/20260711170000_highlights_metadata_and_schema_align.sql '
  'and the MarginaliaStrip tag-library plan (Phase 3).';

-- ---------------------------------------------------------------------------
-- 2. public.highlight_tags — many-to-many junction between highlights and tags.
-- ---------------------------------------------------------------------------

CREATE TABLE public.highlight_tags (
  highlight_id uuid NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, tag_id)
);

COMMENT ON TABLE public.highlight_tags IS
  'Junction table linking public.highlights to normalized public.tags rows '
  '(many-to-many). Going forward this is populated by TagService.setHighlightLabels(); '
  'this migration also backfills it once from legacy highlights.metadata->''tags'' '
  'JSONB arrays. The denormalized user_id column matches the RLS pattern used '
  'elsewhere in this schema (see docs/06-security/rls-policies.md) and avoids a '
  'join through public.tags or public.highlights just to evaluate row security.';

-- ---------------------------------------------------------------------------
-- 3. Indexes.
-- ---------------------------------------------------------------------------

-- Non-unique lookup index on (user_id, name); a unique index already exists
-- from the UNIQUE (user_id, name) table constraint above, but this is kept
-- explicit per the schema sketch for clarity of intent and in case the
-- unique constraint is ever relaxed.
CREATE INDEX IF NOT EXISTS tags_user_id_name_idx
  ON public.tags (user_id, name);

CREATE INDEX IF NOT EXISTS highlight_tags_highlight_id_idx
  ON public.highlight_tags (highlight_id);

CREATE INDEX IF NOT EXISTS highlight_tags_tag_id_idx
  ON public.highlight_tags (tag_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security.
-- Naming/shape follows the established convention in
-- docs/06-security/rls-policies.md (per-operation policies named
-- "<table>_<verb>_own", USING for SELECT/UPDATE/DELETE, WITH CHECK for
-- INSERT/UPDATE, FORCE ROW LEVEL SECURITY so the table owner is not exempt).
-- ---------------------------------------------------------------------------

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

-- SELECT: users can read their own tags.
CREATE POLICY tags_select_own
  ON public.tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: users can create tags only for themselves.
CREATE POLICY tags_insert_own
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can delete only their own tags (e.g. when a tag is no
-- longer referenced by any highlight). No UPDATE policy is granted: tag
-- renaming is not an application feature today, so leaving UPDATE off
-- makes any future bug that tries to rename a tag fail closed (mirrors the
-- append-only rationale for sync_events in docs/06-security/rls-policies.md).
CREATE POLICY tags_delete_own
  ON public.tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.highlight_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_tags FORCE ROW LEVEL SECURITY;

-- SELECT: users can read their own highlight/tag links.
CREATE POLICY highlight_tags_select_own
  ON public.highlight_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: users can create links only for themselves.
CREATE POLICY highlight_tags_insert_own
  ON public.highlight_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can remove their own links (TagService.setHighlightLabels()
-- replaces a highlight's labels via delete + insert). No UPDATE policy is
-- granted: the junction row has no mutable columns other than the primary
-- key, so an update is never a valid operation.
CREATE POLICY highlight_tags_delete_own
  ON public.highlight_tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. One-time data migration: backfill public.tags and public.highlight_tags
-- from the legacy highlights.metadata->'tags' JSONB arrays.
--
-- This section is additive and idempotent:
--   - It does NOT delete or modify highlights.metadata in any way. Notes
--     stay on the highlight row, and metadata.tags is left in place as a
--     read fallback during the app-level transition (see the plan's
--     Phase 4 read-path note: read paths keep unioning junction tags with
--     any remaining metadata.tags until the migration is verified).
--   - Both INSERTs use ON CONFLICT ... DO NOTHING against the unique keys
--     declared above, so re-running this migration (or this section alone)
--     is safe and will not create duplicate tags or duplicate links.
--   - Legacy tag values that don't satisfy the tags_name_normalized_chk
--     constraint after normalization (empty after trim, or longer than the
--     32-char app-level limit) are skipped rather than truncated, so this
--     backfill is an approximation of normalizeHighlightTags() in
--     src/shared/utils/highlight-metadata.ts, not a byte-for-byte replica
--     (it does not truncate to 32 chars, and it does not cap at 10 tags per
--     highlight). See the final report for this limitation.
-- ---------------------------------------------------------------------------

-- 5a. Backfill public.tags with distinct normalized tag names per user.
INSERT INTO public.tags (user_id, name)
SELECT DISTINCT
  h.user_id,
  lower(trim(tag_value)) AS name
FROM public.highlights h
CROSS JOIN LATERAL jsonb_array_elements_text(h.metadata->'tags') AS tag_value
WHERE h.metadata->'tags' IS NOT NULL
  AND jsonb_typeof(h.metadata->'tags') = 'array'
  AND length(lower(trim(tag_value))) > 0
  AND length(lower(trim(tag_value))) <= 32
ON CONFLICT (user_id, name) DO NOTHING;

-- 5b. Backfill public.highlight_tags by joining each highlight back to the
-- (now-populated) public.tags rows for its normalized legacy tag names.
INSERT INTO public.highlight_tags (highlight_id, tag_id, user_id)
SELECT DISTINCT
  h.id AS highlight_id,
  t.id AS tag_id,
  h.user_id
FROM public.highlights h
CROSS JOIN LATERAL jsonb_array_elements_text(h.metadata->'tags') AS tag_value
JOIN public.tags t
  ON t.user_id = h.user_id
  AND t.name = lower(trim(tag_value))
WHERE h.metadata->'tags' IS NOT NULL
  AND jsonb_typeof(h.metadata->'tags') = 'array'
  AND length(lower(trim(tag_value))) > 0
  AND length(lower(trim(tag_value))) <= 32
ON CONFLICT (highlight_id, tag_id) DO NOTHING;
