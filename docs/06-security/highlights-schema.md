# `highlights` table schema

**Status**: Required (production + dev Supabase)  
**Owner**: Backend  
**Last Updated**: 2026-07-11  
**Related**: [rls-policies.md](rls-policies.md)

---

## Purpose

Canonical Postgres schema for Pro cloud sync (`supabase-client.ts`), dual-write, MCP cloud adapter, and ChatGPT connector reads.

Apply migrations from [`supabase/migrations/`](../../supabase/migrations/) in the Supabase SQL Editor (or via Supabase CLI).

---

## Notes and tags

**Not separate `notes` / `tags` columns.** User-authored notes and tags live in **`metadata` JSONB**:

```json
{
  "notes": "Key definition from chapter 3",
  "tags": ["research", "philosophy"]
}
```

| Layer | Location |
|-------|----------|
| TypeScript | `HighlightDataV2.metadata.notes` / `.tags` |
| IndexedDB | Same object on highlight record |
| Supabase | `highlights.metadata` JSONB |
| Serialization | `serializeHighlightMetadataForCloud()` in `src/shared/utils/supabase-highlight-row.ts` |

Do **not** add `text_encrypted`, `note`, or `tags` top-level columns — the app does not read or write them. Encrypted highlight text is stored in `text` as `[ADR013:...]` envelopes.

---

## Column reference

| Column | Type | Required | Written by | Purpose |
|--------|------|----------|------------|---------|
| `id` | `uuid` | yes | extension | Primary key |
| `user_id` | `uuid` | yes | extension | FK → `auth.users`; RLS scope |
| `url` | `text` | yes | extension | Source page URL |
| `text` | `text` | yes | extension | Plaintext or `[ADR013:{...}]` encrypted envelope |
| `color_role` | `text` | yes | extension | Semantic color token (`yellow`, `blue`, …) |
| `selectors` | `jsonb` | yes | extension | TextQuoteSelector for re-anchoring |
| `content_hash` | `text` | yes | extension | SHA-256 dedup hash (64 hex chars) |
| `metadata` | `jsonb` | no | extension | Notes + tags (see above) |
| `created_at` | `timestamptz` | yes | extension | Row creation time |
| `updated_at` | `timestamptz` | yes | extension | Last mutation time |
| `deleted_at` | `timestamptz` | no | extension | Soft delete; `NULL` = active |

---

## Greenfield DDL (reference)

Use when bootstrapping a new Supabase project. Existing projects should run idempotent migrations instead.

```sql
CREATE TABLE IF NOT EXISTS public.highlights (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url           text NOT NULL DEFAULT '',
  text          text NOT NULL DEFAULT '',
  color_role    text NOT NULL DEFAULT 'yellow',
  selectors     jsonb,
  content_hash  text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS highlights_user_active_idx
  ON public.highlights (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS highlights_metadata_gin_idx
  ON public.highlights USING gin (metadata jsonb_path_ops)
  WHERE metadata IS NOT NULL;

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights FORCE ROW LEVEL SECURITY;
```

RLS policies: see [rls-policies.md](rls-policies.md).

---

## Deprecated / unused columns

These appear in older design docs but are **not** used by current application code:

| Column | Status |
|--------|--------|
| `text_encrypted` | Never existed in production code path |
| `note` / `notes` (top-level) | Replaced by `metadata.notes` |
| `tags` (top-level `text[]`) | Replaced by `metadata.tags` |
| `device_id`, `domain`, `title`, `position`, `mode`, `version` | Legacy data-architecture sketch only |

---

## Verification

After migration, in SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'highlights'
ORDER BY ordinal_position;
```

Expect `metadata` with type `jsonb`.

Test insert shape (authenticated session):

```sql
-- Example metadata payload only; do not run without auth context
-- metadata := '{"notes":"test","tags":["demo"]}'::jsonb
```
