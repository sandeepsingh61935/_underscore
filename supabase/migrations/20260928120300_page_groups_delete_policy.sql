-- Page Groups tombstone-only DELETE policy + client-fallback purge (ADR-032 §8,
-- page-groups Phase 2 Task 2.4). Requires tables from
-- 20260928120000_page_groups.sql.
--
-- CONTROLLER RULING (binding): the client fallback ships unconditionally —
-- it is safe in both worlds. When pg_cron is enabled, the Task 2.1 daily
-- server purge already removed expired tombstones and the client batch
-- delete is a no-op; when pg_cron is absent, this policy is the ONLY path
-- that lets the client hard-delete its own expired tombstones after
-- hydration (via SupabaseGroupRepository.purgeTombstones).
--
-- The policy authorizes exactly the client purge predicate and nothing
-- more: own rows (`user_id = auth.uid()`), tombstones only
-- (`deleted_at IS NOT NULL`), strictly older than 30 days
-- (`deleted_at < now() - interval '30 days'`). A row soft-deleted 29 days
-- ago, and any live row, can never be hard-deleted through this policy.

-- ---------------------------------------------------------------------------
-- 1. Tombstone-only DELETE policies (USING without WITH CHECK: DELETE
-- carries no new row, so USING alone governs the operation).
-- ---------------------------------------------------------------------------

CREATE POLICY page_groups_delete_expired_tombstones
  ON public.page_groups
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
  );

CREATE POLICY page_group_items_delete_expired_tombstones
  ON public.page_group_items
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
  );

-- ---------------------------------------------------------------------------
-- 2. Grants. The 20260928120100 grants migration deliberately omitted
-- DELETE; it is granted here, scoped by the policies above. Guarded so
-- empty projects do not fail CLI migrate before the create migration runs.
-- ---------------------------------------------------------------------------

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
