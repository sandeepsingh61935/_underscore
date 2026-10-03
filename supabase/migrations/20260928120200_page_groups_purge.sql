-- Daily hard purge of page-group tombstones soft-deleted > 30 days ago (ADR-032 §8).
-- Requires tables from 20260928120000_page_groups.sql.
--
-- Gated on the pg_cron extension so db push works with or without it: when
-- pg_cron is absent this migration only installs the purge function and the
-- client fallback (Task 2.4) owns deletion. No precedent for optional
-- extensions exists in this repo, so the gate is a DO block checking
-- pg_extension (static cron.* references inside the guarded branch are only
-- planned when reached, hence safe when the extension is missing).

-- Purge function: SECURITY DEFINER so it can hard-delete without any
-- authenticated DELETE policy. Items first, then groups (group delete would
-- cascade to items anyway).
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

-- Daily schedule at 03:00 UTC, installed once when pg_cron is available.
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
