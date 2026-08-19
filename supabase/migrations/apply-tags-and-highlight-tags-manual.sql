-- Manual apply: public.tags + public.highlight_tags (+ grants + backfill)
-- Paste into Supabase Dashboard → SQL → New query → Run.
-- Safe to re-run.
--
-- Handles both uuid and text public.highlights.id (some projects use text ids).
-- Prerequisite: public.highlights exists (preferably with metadata jsonb).

-- ---------------------------------------------------------------------------
-- 0. Resolve highlights.id type (uuid vs text)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  hl_id_type text;
BEGIN
  SELECT c.data_type
    INTO hl_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'highlights'
    AND c.column_name = 'id';

  IF hl_id_type IS NULL THEN
    RAISE EXCEPTION 'public.highlights.id not found — create highlights first';
  END IF;

  -- Normalize Postgres data_type names we care about
  IF hl_id_type NOT IN ('uuid', 'text', 'character varying') THEN
    RAISE EXCEPTION 'Unsupported public.highlights.id type: %', hl_id_type;
  END IF;

  -- Store for later statements via a temp setting
  PERFORM set_config('app.highlights_id_type', hl_id_type, false);
END $$;

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

-- Create highlight_tags with highlight_id matching highlights.id type.
DO $$
DECLARE
  hl_id_type text := current_setting('app.highlights_id_type', true);
  hl_sql_type text;
BEGIN
  IF hl_id_type IS NULL OR hl_id_type = '' THEN
    SELECT c.data_type INTO hl_id_type
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'highlights'
      AND c.column_name = 'id';
  END IF;

  IF hl_id_type = 'uuid' THEN
    hl_sql_type := 'uuid';
  ELSE
    -- text / character varying
    hl_sql_type := 'text';
  END IF;

  IF to_regclass('public.highlight_tags') IS NULL THEN
    EXECUTE format($f$
      CREATE TABLE public.highlight_tags (
        highlight_id %s NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (highlight_id, tag_id)
      )
    $f$, hl_sql_type);
  ELSE
    -- Table exists: verify highlight_id type is compatible (no silent mismatch).
    DECLARE
      existing_type text;
    BEGIN
      SELECT c.data_type INTO existing_type
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'highlight_tags'
        AND c.column_name = 'highlight_id';

      IF existing_type IS DISTINCT FROM hl_id_type
         AND NOT (
           existing_type IN ('text', 'character varying')
           AND hl_id_type IN ('text', 'character varying')
         )
      THEN
        RAISE EXCEPTION
          'public.highlight_tags.highlight_id is % but public.highlights.id is %. Drop highlight_tags and re-run.',
          existing_type, hl_id_type;
      END IF;
    END;
  END IF;
END $$;

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
-- 3. Grants
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
WHERE h.metadata IS NOT NULL
  AND h.metadata->'tags' IS NOT NULL
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
WHERE h.metadata IS NOT NULL
  AND h.metadata->'tags' IS NOT NULL
  AND jsonb_typeof(h.metadata->'tags') = 'array'
  AND length(lower(trim(tag_value))) > 0
  AND length(lower(trim(tag_value))) <= 32
ON CONFLICT (highlight_id, tag_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
