-- Ensure authenticated clients can dual-write page_groups + page_group_items under RLS.
-- Requires tables from 20260928120000_page_groups.sql.
-- If you see: relation "public.page_groups" does not exist — run the full manual script first:
--   supabase/migrations/apply-page-groups-manual.sql
--
-- Guarded so empty projects do not fail CLI migrate before the create migration runs.
--
-- DELETE is intentionally not granted: there is no DELETE policy (Task 2.4 adds a
-- tombstone-only one if pg_cron is unavailable, with its own grant then).

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
