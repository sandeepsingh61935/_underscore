-- Ensure authenticated clients can dual-write tags + highlight_tags under RLS.
-- Requires tables from 20260713180000_tags_and_highlight_tags.sql.
-- If you see: relation "public.tags" does not exist — run the full manual script first:
--   supabase/migrations/apply-tags-and-highlight-tags-manual.sql
--
-- Guarded so empty projects do not fail CLI migrate before the create migration runs.

DO $$
BEGIN
  IF to_regclass('public.tags') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON TABLE public.tags TO authenticated';
  END IF;
  IF to_regclass('public.highlight_tags') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON TABLE public.highlight_tags TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
