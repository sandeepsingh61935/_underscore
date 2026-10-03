-- One-shot apply for remote SQL Editor (ADR-032 page groups).
-- Project: cuzwaukxagefyvtxbqmi
-- Dashboard: https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new
--
-- Safe to re-run. Creates page_groups + page_group_items + RLS + triggers +
-- caps + grants + realtime + purge when pg_cron is available + the Task 2.4
-- tombstone-only DELETE policy (client-fallback purge).
-- Prefer: npx supabase db push --linked --yes  (when CLI works)
--
-- This is an idempotent copy of 20260928120000_page_groups.sql,
-- 20260928120100_page_groups_grants_authenticated.sql,
-- 20260928120200_page_groups_purge.sql and
-- 20260928120300_page_groups_delete_policy.sql. The collections drop is intentionally
-- EXCLUDED (own migration: 20260928090000_drop_orphan_collections.sql).

-- ── tables ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  position text NOT NULL,
  bound_device_id text,
  bound_device_label text,
  bound_browser text,
  bound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT page_groups_name_len_chk CHECK (
    char_length(trim(name)) >= 1
    AND char_length(trim(name)) <= 80
  ),
  CONSTRAINT page_groups_color_chk CHECK (
    color IN ('grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange')
  ),
  CONSTRAINT page_groups_position_chk CHECK (char_length(position) >= 1),
  CONSTRAINT page_groups_bound_browser_chk CHECK (
    bound_browser IS NULL OR bound_browser IN ('chrome', 'firefox', 'edge')
  ),
  CONSTRAINT page_groups_bound_device_label_chk CHECK (
    bound_device_label IS NULL OR char_length(bound_device_label) <= 120
  )
);

COMMENT ON TABLE public.page_groups IS
  'User-named page groups (ADR-032). Durable app record; browser tab-group '
  'links live in chrome.storage.local, server keeps only bound_* columns.';

CREATE TABLE IF NOT EXISTS public.page_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.page_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url_normalized text,
  hostname text,
  include_subdomains boolean NOT NULL DEFAULT false,
  title text,
  favicon_url text,
  position text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT page_group_items_kind_chk CHECK (kind IN ('page', 'domain')),
  CONSTRAINT page_group_items_shape_ck CHECK (
    (
      kind = 'page'
      AND url_normalized IS NOT NULL
      AND char_length(url_normalized) >= 1
      AND char_length(url_normalized) <= 2048
      AND hostname IS NULL
    )
    OR (
      kind = 'domain'
      AND hostname IS NOT NULL
      AND char_length(hostname) >= 1
      AND char_length(hostname) <= 255
      AND url_normalized IS NULL
    )
  ),
  CONSTRAINT page_group_items_position_chk CHECK (char_length(position) >= 1),
  CONSTRAINT page_group_items_title_chk CHECK (
    title IS NULL OR char_length(title) <= 500
  ),
  CONSTRAINT page_group_items_favicon_chk CHECK (
    favicon_url IS NULL
    OR (favicon_url ~* '^https?://' AND char_length(favicon_url) <= 2048)
  )
);

COMMENT ON TABLE public.page_group_items IS
  'Page/domain members of a page group (ADR-032). kind=page pins one '
  'normalized URL; kind=domain is a live hostname rule.';

-- ── indexes ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS page_group_items_page_url_uniq
  ON public.page_group_items (group_id, url_normalized)
  WHERE kind = 'page' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS page_group_items_domain_host_uniq
  ON public.page_group_items (group_id, hostname)
  WHERE kind = 'domain' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS page_groups_user_updated_at_idx
  ON public.page_groups (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS page_group_items_user_updated_at_idx
  ON public.page_group_items (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS page_group_items_group_id_idx
  ON public.page_group_items (group_id);

-- ── RLS page_groups (owner select/insert/update; no delete policy) ──────
ALTER TABLE public.page_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_groups FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_groups'
      AND policyname = 'page_groups_select_own'
  ) THEN
    CREATE POLICY page_groups_select_own
      ON public.page_groups FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_groups'
      AND policyname = 'page_groups_insert_own'
  ) THEN
    CREATE POLICY page_groups_insert_own
      ON public.page_groups FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_groups'
      AND policyname = 'page_groups_update_own'
  ) THEN
    CREATE POLICY page_groups_update_own
      ON public.page_groups FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── RLS page_group_items ───────────────────────────────────────────────
ALTER TABLE public.page_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_group_items FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_group_items'
      AND policyname = 'page_group_items_select_own'
  ) THEN
    CREATE POLICY page_group_items_select_own
      ON public.page_group_items FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_group_items'
      AND policyname = 'page_group_items_insert_own'
  ) THEN
    CREATE POLICY page_group_items_insert_own
      ON public.page_group_items FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_group_items'
      AND policyname = 'page_group_items_update_own'
  ) THEN
    CREATE POLICY page_group_items_update_own
      ON public.page_group_items FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── triggers ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.page_groups_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_groups_touch_updated_at ON public.page_groups;
CREATE TRIGGER page_groups_touch_updated_at
  BEFORE UPDATE ON public.page_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_touch_updated_at();

DROP TRIGGER IF EXISTS page_group_items_touch_updated_at ON public.page_group_items;
CREATE TRIGGER page_group_items_touch_updated_at
  BEFORE UPDATE ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_touch_updated_at();

CREATE OR REPLACE FUNCTION public.page_group_items_enforce_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.page_groups
  WHERE id = NEW.group_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id <> v_owner THEN
    RAISE EXCEPTION 'page_group_items user_id must equal its group''s user_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_group_items_enforce_owner ON public.page_group_items;
CREATE TRIGGER page_group_items_enforce_owner
  BEFORE INSERT OR UPDATE OF group_id, user_id ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_group_items_enforce_owner();

CREATE OR REPLACE FUNCTION public.page_groups_enforce_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    IF (
      SELECT count(*)
      FROM public.page_groups
      WHERE user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id <> NEW.id
    ) >= 200 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'group_cap_exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_groups_enforce_cap ON public.page_groups;
CREATE TRIGGER page_groups_enforce_cap
  BEFORE INSERT OR UPDATE OF deleted_at, user_id ON public.page_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_enforce_cap();

CREATE OR REPLACE FUNCTION public.page_group_items_enforce_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kind = 'page' AND NEW.deleted_at IS NULL THEN
    IF (
      SELECT count(*)
      FROM public.page_group_items
      WHERE group_id = NEW.group_id
        AND kind = 'page'
        AND deleted_at IS NULL
        AND id <> NEW.id
    ) >= 500 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'group_cap_exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_group_items_enforce_cap ON public.page_group_items;
CREATE TRIGGER page_group_items_enforce_cap
  BEFORE INSERT OR UPDATE OF group_id, kind, deleted_at ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_group_items_enforce_cap();

-- ── realtime ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'page_groups'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.page_groups';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'page_group_items'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.page_group_items';
    END IF;
  END IF;
END $$;

-- ── grants (base SELECT/INSERT/UPDATE; DELETE granted with the Task 2.4
-- delete policy below) ─────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.page_groups') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE public.page_groups TO authenticated';
  END IF;
  IF to_regclass('public.page_group_items') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE public.page_group_items TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── purge (function always; schedule only when pg_cron exists) ─────────
CREATE OR REPLACE FUNCTION public.purge_page_group_tombstones()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '30 days';
BEGIN
  DELETE FROM public.page_group_items WHERE deleted_at < v_cutoff;
  DELETE FROM public.page_groups WHERE deleted_at < v_cutoff;
END;
$$;

COMMENT ON FUNCTION public.purge_page_group_tombstones() IS
  'Hard-deletes page_groups / page_group_items rows soft-deleted more than 30 days ago (ADR-032 §8).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'purge-page-group-tombstones-daily'
    ) THEN
      PERFORM cron.schedule(
        'purge-page-group-tombstones-daily',
        '0 3 * * *',
        'SELECT public.purge_page_group_tombstones()'
      );
    END IF;
  END IF;
END $$;

-- ── delete policy (Task 2.4 client fallback; idempotent copy of
-- 20260928120300_page_groups_delete_policy.sql) ────────────────────────
-- Tombstones only: own rows, deleted_at NOT NULL, strictly older than 30d.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_groups'
      AND policyname = 'page_groups_delete_expired_tombstones'
  ) THEN
    CREATE POLICY page_groups_delete_expired_tombstones
      ON public.page_groups FOR DELETE TO authenticated
      USING (
        user_id = auth.uid()
        AND deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'page_group_items'
      AND policyname = 'page_group_items_delete_expired_tombstones'
  ) THEN
    CREATE POLICY page_group_items_delete_expired_tombstones
      ON public.page_group_items FOR DELETE TO authenticated
      USING (
        user_id = auth.uid()
        AND deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.page_groups') IS NOT NULL THEN
    EXECUTE 'GRANT DELETE ON TABLE public.page_groups TO authenticated';
  END IF;
  IF to_regclass('public.page_group_items') IS NOT NULL THEN
    EXECUTE 'GRANT DELETE ON TABLE public.page_group_items TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Record versions when CLI history table exists (no-op otherwise).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
  ) THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
    VALUES
      ('20260928120000', 'page_groups', ARRAY['-- applied via apply-page-groups-manual.sql']),
      ('20260928120100', 'page_groups_grants_authenticated', ARRAY['-- applied via apply-page-groups-manual.sql']),
      ('20260928120200', 'page_groups_purge', ARRAY['-- applied via apply-page-groups-manual.sql']),
      ('20260928120300', 'page_groups_delete_policy', ARRAY['-- applied via apply-page-groups-manual.sql'])
    ON CONFLICT (version) DO NOTHING;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN
    -- Older history shape: version only
    BEGIN
      INSERT INTO supabase_migrations.schema_migrations (version)
      VALUES ('20260928120000'), ('20260928120100'), ('20260928120200'), ('20260928120300')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Verify
SELECT
  'page_groups' AS table_name,
  to_regclass('public.page_groups') IS NOT NULL AS exists
UNION ALL
SELECT
  'page_group_items',
  to_regclass('public.page_group_items') IS NOT NULL;
