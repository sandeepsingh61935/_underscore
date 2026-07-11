-- Align public.highlights with extension cloud sync + MCP adapter.
-- Notes and tags are stored inside metadata JSONB (not separate columns).
-- See docs/06-security/highlights-schema.md

-- User notes + tags (HighlightDataV2.metadata → cloud)
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.highlights.metadata IS
  'User notes and tags: {"notes":"...", "tags":["tag-a","tag-b"]}. Serialized by serializeHighlightMetadataForCloud().';

-- Core highlight payload columns (may be missing on older projects)
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS color_role text DEFAULT 'yellow';

ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS selectors jsonb;

ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Active highlights by user (matches getHighlights / MCP list queries)
CREATE INDEX IF NOT EXISTS highlights_user_active_idx
  ON public.highlights (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Optional: filter/search by tags in metadata
CREATE INDEX IF NOT EXISTS highlights_metadata_gin_idx
  ON public.highlights USING gin (metadata jsonb_path_ops)
  WHERE metadata IS NOT NULL;
