-- Drop the orphan `public.collections` table (ADR-032, page-groups Phase 0 Task 0.2).
-- The table was never created by any repo migration and no client code references
-- it (orphan Supabase client removed in Task 0.1). Owner confirmed production row
-- count is ZERO, so the drop is safe. Idempotent via IF EXISTS.

drop table if exists public.collections cascade;
