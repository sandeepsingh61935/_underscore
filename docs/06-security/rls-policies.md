# RLS Policies

**Status**: Required (production deployment)
**Owner**: Backend
**Last Updated**: 2026-07-11
**Related**: [security-architecture.md](security-architecture.md), [highlights-schema.md](highlights-schema.md)

---

## Purpose

`src/background/api/supabase-client.ts` issues queries against three tables — `highlights`, `sync_events`, `collections` — and applies `user_id` filters in the query builder. Those filters are **defense in depth**, not the primary authorization control. The primary control is Row Level Security (RLS) on the Supabase Postgres tables.

If RLS is disabled on any of these tables, an authenticated user can read or write any other user's data by simply omitting the `user_id` filter (or supplying another user's id).

This document is the source of truth for the RLS policies that must exist in Supabase. The runtime tripwire in `SupabaseClient.verifyRls()` asserts that RLS is enabled and that the required policies exist at app startup.

---

## Conventions

- All tables use a `user_id uuid not null` column populated by the application. RLS policies compare it to `auth.uid()`.
- All policies are `PERMISSIVE` (Postgres default) and apply to the `authenticated` and `anon` roles. The `service_role` role bypasses RLS by design — it is used only from trusted server contexts (Cloudflare Workers, migrations, admin scripts) and is never exposed to the extension.
- Policies use `auth.uid()` rather than reading a value from a function or join, so they remain cheap on the hot path.
- Tables that store encrypted payload fields (client-side AES-GCM; keys never leave the client — see `src/background/auth/key-manager.ts`) still rely on RLS for **access control**. Encryption protects confidentiality against a Supabase operator or a leak of the database; RLS protects against cross-tenant access by authenticated clients.

---

## `highlights`

**Application access pattern** (`src/background/api/supabase-client.ts`):

| Method | Verbs | Columns / filters |
| --- | --- | --- |
| `createHighlight` | INSERT | `id`, `user_id`, `url`, `text`, `color_role`, `selectors`, `content_hash`, `metadata`, `created_at`, `updated_at` |
| `updateHighlight` | UPDATE | `text`, `color_role`, `content_hash`, `metadata`, `updated_at`; filter `id`, `user_id` |
| `deleteHighlight` | UPDATE (soft) | sets `deleted_at`, `updated_at`; filter `id`, `user_id` |
| `softDeleteAllHighlights` | UPDATE | sets `deleted_at`; filter `user_id`, `deleted_at is null` |
| `getHighlights` | SELECT | `*`; filter `user_id`, `deleted_at is null`, optional `url` |

Notes and tags are stored in **`metadata` JSONB** (`{"notes":"...","tags":["..."]}`), not separate columns. See [highlights-schema.md](highlights-schema.md).

### Required schema setup

```sql
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights FORCE ROW LEVEL SECURITY;
```

`FORCE` is required so that the table owner is also subject to RLS — without it, a misconfigured service-role fallback could read every row.

### Required policies

```sql
-- SELECT: users can read their own non-deleted highlights.
CREATE POLICY highlights_select_own
  ON public.highlights
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: users can create rows only for themselves.
-- WITH CHECK prevents a user from inserting with someone else's user_id.
CREATE POLICY highlights_insert_own
  ON public.highlights
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own rows.
-- USING gates which rows are visible to the update; WITH CHECK gates the
-- new row contents (in particular, prevents re-assigning user_id).
CREATE POLICY highlights_update_own
  ON public.highlights
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: a hard delete is not currently used (the app soft-deletes via
-- UPDATE). The policy is included to ensure that if hard delete is ever
-- exposed, it remains tenant-scoped.
CREATE POLICY highlights_delete_own
  ON public.highlights
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

Notes:

- Soft-delete is implemented as `UPDATE ... SET deleted_at = now()`, so the `highlights_update_own` policy is the one that actually fires for `deleteHighlight` and `softDeleteAllHighlights`. The `highlights_delete_own` policy is defense in depth.
- Anon access is denied: no `TO anon` policies exist. Unauthenticated traffic receives zero rows.

---

## `sync_events`

**Application access pattern** (`src/background/api/supabase-client.ts`):

| Method | Verbs | Filters |
| --- | --- | --- |
| `pushEvents` | INSERT | `event_id`, `user_id`, `type`, `data`, `timestamp`, `device_id`, `vector_clock`, `checksum` |
| `pullEvents` | SELECT | `user_id = ?`, `timestamp > ?`, ordered ascending |

### Required schema setup

```sql
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events FORCE ROW LEVEL SECURITY;
```

### Required policies

```sql
CREATE POLICY sync_events_select_own
  ON public.sync_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY sync_events_insert_own
  ON public.sync_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE and DELETE on sync_events are not exposed in the application.
-- The event log is append-only. No policies are granted, so these
-- operations will fail closed for the `authenticated` role. The
-- service_role retains access for admin retention jobs.
```

Notes:

- The application does not update or delete sync events. Leaving the policies off makes any future bug that tries to mutate the log fail loudly with a permission error, which is the desired safe default.
- The tripwire only requires `SELECT` and `INSERT` for `sync_events`. If a migration accidentally adds a permissive `USING (true)` policy on `UPDATE` or `DELETE`, the tripwire will not flag it — that is a known gap, see [Future work](#future-work).

---

## `collections`

**Application access pattern** (`src/background/api/supabase-client.ts`):

| Method | Verbs | Filters |
| --- | --- | --- |
| `createCollection` | INSERT | `user_id`, `name`, `description`, `created_at`, `updated_at` |
| `getCollections` | SELECT | `user_id = ?`, joined with `highlights(count)` |

### Required schema setup

```sql
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections FORCE ROW LEVEL SECURITY;
```

### Required policies

```sql
CREATE POLICY collections_select_own
  ON public.collections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY collections_insert_own
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY collections_update_own
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY collections_delete_own
  ON public.collections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

Notes:

- Collections are currently read + create only in the application. `UPDATE` and `DELETE` policies are listed for parity and to keep the table consistent if a future feature edits collections. Both `USING` and `WITH CHECK` are required for `UPDATE` so a row cannot be re-assigned to a different user.
- `getCollections` performs a join onto `highlights(count)`. The RLS policy on `highlights` automatically restricts the joined count to the caller's own highlights, so a user cannot infer the highlight count of another user's collections by joining around the policy.

---

## Service-role bypass

The `service_role` Postgres role bypasses RLS by default. It is used from trusted server contexts only:

- Cloudflare Workers API (after JWT validation).
- Supabase migrations and admin scripts.

The service-role key is **never** embedded in the extension, the web app bundle, or any client-reachable code. The extension and web app use the anon key, which is subject to RLS.

This means an attacker who controls the anon key cannot escalate to service-role by manipulating the client; they remain subject to every RLS policy listed above.

---

## Runtime tripwire

`SupabaseClient` calls a private `verifyRls()` method during construction. The method queries `pg_policies` (or, if the catalog view is not exposed by PostgREST, falls back to a no-op with a `logger.warn`) and asserts:

1. RLS is enabled (`rowsecurity = true`) for `highlights`, `sync_events`, `collections`.
2. The required policies listed above exist with the correct command and role.

If either check fails, the tripwire logs a `logger.warn` with the table name and the gap. **It does not throw** — the application continues to start. This is intentional: a misconfigured RLS is a serious security regression, but it is not a reason to brick the user's local install. The warning surfaces in the console for operators, and the application keeps functioning with the defense-in-depth `user_id` filters in the client.

The tripwire is in `src/background/api/supabase-client.ts` — see `verifyRls()` and the unit test in `tests/unit/background/api/supabase-client.test.ts`.

### Known limitation: `pg_policies` access

PostgREST only exposes schemas in the `expose_schemas` list. The `pg_catalog` schema is **not** exposed by default. If the tripwire query returns a permission error or an empty result, the tripwire logs a warning and continues:

```
[SupabaseClient] RLS verification could not query pg_policies (PostgREST does not expose pg_catalog). RLS is unverified for this session.
```

In production this is expected on Supabase Cloud unless an RPC is exposed via a migration. Recommended follow-up: add a migration that defines a `SECURITY DEFINER` function `public.verify_rls()` returning a JSON array of `{ table, rls_enabled, policies[] }`, and have the tripwire call it via `.rpc('verify_rls')`. The function runs as the function owner (a role with catalog access), so anon/authenticated clients can call it without privilege escalation. This is tracked in [Future work](#future-work).

---

## Operational checklist

When adding a new Supabase table that the extension or web app reads or writes:

- [ ] Add a `user_id uuid not null` column (or equivalent tenant key).
- [ ] Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;`.
- [ ] Add SELECT / INSERT / UPDATE / DELETE policies scoped to `auth.uid() = user_id`.
- [ ] Update this document with the new table and its policies.
- [ ] Extend `SupabaseClient.verifyRls()` to include the new table.

A pull request that adds a new table without the above should be blocked at code review.

---

## Future work

The ADR's full scope included infrastructure that does not exist in this repo. The following are explicitly **deferred** from this change:

- **Cross-tenant integration test** (`tests/integration/supabase-rls.integration.test.ts`). Requires a Supabase emulator or a dedicated test project. The repo currently has no `supabase/` directory and no Supabase CLI config. When the emulator is added, the test should:
  - Create two users (Alice, Bob) with separate JWTs.
  - Insert a row as Alice.
  - Assert that Bob's SELECT returns zero rows for Alice's `user_id`.
  - Assert that Bob's INSERT with `user_id = alice.id` fails the `WITH CHECK` policy.
  - Assert that Bob's UPDATE / DELETE on Alice's row matches zero rows.
  - Assert that the anonymous role (no JWT) returns zero rows on SELECT and fails INSERT.
- **CI step** that runs the integration test (e.g. `supabase start` as a service, then `vitest run tests/integration/supabase-rls`).
- **Runbook** for the operator response when the tripwire logs an RLS gap in production (escalation, rollback, audit).
- **RPC for tripwire** (`public.verify_rls()`) so the anon/authenticated role can read the catalog via PostgREST. See "Known limitation" above.
- **Coverage** of `UPDATE` and `DELETE` policies on `sync_events` (currently append-only, no policy required).
