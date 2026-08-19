-- Manual apply: public.tags + public.highlight_tags (+ grants + backfill)
-- Paste into Supabase Dashboard → SQL → New query → Run.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
--
-- Prerequisite: public.highlights exists with metadata jsonb
--   (see 20260711170000_highlights_metadata_and_schema_align.sql).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  CONSTRAINT tags_name_normalized_chk CHECK (
    name = lower(trim(name))
    AND length(name) > 0
    AND length(name) <= 32
  )
);

CREATE TABLE IF NOT EXISTS public.highlight_tags (
  highlight_id uuid NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, tag_id)
);

CREATE INDEX IF NOT EXISTS tags_user_id_name_idx
  ON public.tags (user_id, name);

CREATE INDEX IF NOT EXISTS highlight_tags_highlight_id_idx
  ON public.highlight_tags (highlight_id);

CREATE INDEX IF NOT EXISTS highlight_tags_tag_id_idx
  ON public.highlight_tags (tag_id);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

ALTER TABLE public.highlight_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_select_own ON public.tags;
CREATE POLICY tags_select_own
  ON public.tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tags_insert_own ON public.tags;
CREATE POLICY tags_insert_own
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tags_delete_own ON public.tags;
CREATE POLICY tags_delete_own
  ON public.tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS highlight_tags_select_own ON public.highlight_tags;
CREATE POLICY highlight_tags_select_own
  ON public.highlight_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS highlight_tags_insert_own ON public.highlight_tags;
CREATE POLICY highlight_tags_insert_own
  ON public.highlight_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS highlight_tags_delete_own ON public.highlight_tags;
CREATE POLICY highlight_tags_delete_own
  ON public.highlight_tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Grants (required for PostgREST / authenticated clients)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, DELETE ON TABLE public.tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.highlight_tags TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill from highlights.metadata->'tags' (idempotent)
-- ---------------------------------------------------------------------------

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

NOTIFY pgrst, 'reload schema';
