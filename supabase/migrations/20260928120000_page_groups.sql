-- Page Groups tables (ADR-032, page-groups Phase 2 Task 2.1).
-- Owner-only RLS, soft delete (deleted_at), trigger-enforced owner consistency
-- and caps (200 live groups/user, 500 live page-items/group), Realtime on both.
--
-- CHECKs mirror the client-side Zod schemas in
-- src/shared/schemas/page-group-schema.ts (GroupNameSchema 1..80 after trim,
-- GroupColorSchema 9 colors, favicon http(s) + <=2048, BoundBrowserSchema,
-- title <=500, hostname <=255, url 1..2048).
--
-- No DELETE policy here: hard delete is purge-only (see
-- 20260928120200_page_groups_purge.sql); Task 2.4 adds a tombstone-only DELETE
-- policy if pg_cron is unavailable.

-- ---------------------------------------------------------------------------
-- 1. public.page_groups — durable app group (name + color, Chrome tab-group
-- semantics). Browser link state lives in chrome.storage.local; the server
-- stores only bound_device_id/label/browser/at.
-- ---------------------------------------------------------------------------

CREATE TABLE public.page_groups (
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

-- ---------------------------------------------------------------------------
-- 2. public.page_group_items — page (normalized URL) or domain (hostname rule)
-- members of a group.
-- ---------------------------------------------------------------------------

CREATE TABLE public.page_group_items (
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

-- ---------------------------------------------------------------------------
-- 3. Indexes. Partial uniques ignore soft-deleted rows; (user_id, updated_at)
-- supports incremental pull (hydration cursor).
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX page_group_items_page_url_uniq
  ON public.page_group_items (group_id, url_normalized)
  WHERE kind = 'page' AND deleted_at IS NULL;

CREATE UNIQUE INDEX page_group_items_domain_host_uniq
  ON public.page_group_items (group_id, hostname)
  WHERE kind = 'domain' AND deleted_at IS NULL;

CREATE INDEX page_groups_user_updated_at_idx
  ON public.page_groups (user_id, updated_at DESC);

CREATE INDEX page_group_items_user_updated_at_idx
  ON public.page_group_items (user_id, updated_at DESC);

CREATE INDEX page_group_items_group_id_idx
  ON public.page_group_items (group_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security. Owner-only select/insert/update; NO delete policy
-- (Task 2.4 decides). FORCE so the table owner is not exempt.
-- ---------------------------------------------------------------------------

ALTER TABLE public.page_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_groups FORCE ROW LEVEL SECURITY;

CREATE POLICY page_groups_select_own
  ON public.page_groups
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY page_groups_insert_own
  ON public.page_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY page_groups_update_own
  ON public.page_groups
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.page_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_group_items FORCE ROW LEVEL SECURITY;

CREATE POLICY page_group_items_select_own
  ON public.page_group_items
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY page_group_items_insert_own
  ON public.page_group_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY page_group_items_update_own
  ON public.page_group_items
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Triggers: updated_at touch, item owner consistency, caps.
-- Caps raise SQLSTATE P0001 with message group_cap_exceeded (mapped to
-- GroupCapError by the repository in Task 2.2).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.page_groups_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER page_groups_touch_updated_at
  BEFORE UPDATE ON public.page_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_touch_updated_at();

CREATE TRIGGER page_group_items_touch_updated_at
  BEFORE UPDATE ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_touch_updated_at();

-- Item user_id must equal its group's user_id (defense in depth behind RLS).
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
    -- Let the group_id FK raise its violation.
    RETURN NEW;
  END IF;
  IF NEW.user_id <> v_owner THEN
    RAISE EXCEPTION 'page_group_items user_id must equal its group''s user_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER page_group_items_enforce_owner
  BEFORE INSERT OR UPDATE OF group_id, user_id ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_group_items_enforce_owner();

-- Cap: 200 live groups per user (un-deletes count; self excluded so live-row
-- updates at the cap still succeed).
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

CREATE TRIGGER page_groups_enforce_cap
  BEFORE INSERT OR UPDATE OF deleted_at, user_id ON public.page_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.page_groups_enforce_cap();

-- Cap: 500 live page-items per group (domain rules are uncapped).
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

CREATE TRIGGER page_group_items_enforce_cap
  BEFORE INSERT OR UPDATE OF group_id, kind, deleted_at ON public.page_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.page_group_items_enforce_cap();

-- ---------------------------------------------------------------------------
-- 6. Realtime (extension + web app subscriptions). Guarded so db push works
-- whether or not the supabase_realtime publication exists yet.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.page_groups';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.page_group_items';
  END IF;
END $$;
