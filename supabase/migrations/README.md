# Supabase migrations

Local source of truth: `supabase/migrations/*.sql` (timestamp-ordered).

Remote tracks applied versions in `supabase_migrations.schema_migrations`
(created by CLI on first successful push, or by the bootstrap script below).

## Preferred: CLI push

```bash
cd /home/sandy/projects/_underscore

# One-time: browser login (interactive terminal only)
npx supabase login

# Link + push all pending files
npx supabase link --project-ref cuzwaukxagefyvtxbqmi
npx supabase db push --linked --yes
```

Or:

```bash
npm run supabase:migrate
```

With database password (when Management API login-role fails):

```bash
# Reset password: Dashboard → Project Settings → Database
npx supabase db push --linked --yes -p "$SUPABASE_DB_PASSWORD"
```

### Known CLI failures on this project

| Error | Meaning | Fix |
|-------|---------|-----|
| `permission denied to alter role "cli_login_postgres"` | Linked push via Management API cannot mint temp role | Use DB password (`-p`) **or** bootstrap SQL below |
| `password authentication failed for user "postgres"` | Wrong/outdated DB password | Reset DB password in Dashboard, then `-p` again |
| `relation "supabase_migrations.schema_migrations" does not exist` | History never bootstrapped | Run bootstrap SQL below once |

## Bootstrap + apply via migration history (SQL Editor)

Use when CLI cannot connect. This **is** the migrations path: it creates
CLI history, marks older files applied, applies `20260812120000_ai_preferences`,
and records the version.

1. Open [SQL Editor](https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new)
2. Paste and run: **`bootstrap-cli-migrations-and-apply-ai-preferences.sql`**
3. Confirm results:
   - `ai_preferences_table` → `ai_preferences`
   - versions list includes `20260812120000`

After that, future work is normal: add a new `supabase/migrations/<ts>_name.sql`
and `db push` (once password/login-role works).

Do **not** paste ad-hoc DDL into the dashboard for schema that belongs in
`supabase/migrations/` — add a migration file first.

## Migrations in this repo

| File | Purpose |
|------|---------|
| `20260711170000_highlights_metadata_and_schema_align.sql` | metadata JSONB, core column align |
| `20260713180000_tags_and_highlight_tags.sql` | tags + highlight_tags |
| `20260725120000_billing_entitlements.sql` | billing entitlements |
| `20260804120000_billing_rate_limits.sql` | billing rate limits |
| `20260812120000_ai_preferences.sql` | AI prefs LWW (default + enablement, no secrets) |
| `20260812140000_ai_preferences_xai.sql` | Allow `xai` in default_provider check |
| `20260812160000_chat_threads_messages.sql` | Grounded chat threads + messages (ADR-028) |
| `bootstrap-cli-migrations-and-apply-ai-preferences.sql` | one-shot history bootstrap + apply ai_preferences |
| `apply-ai-preferences-manual.sql` | legacy table-only fallback (no history) |
| `apply-chat-threads-messages-manual.sql` | SQL Editor one-shot for chat_threads + chat_messages |

### Chat tables missing (`Could not find the table 'public.chat_threads'`)

App code is live; schema must be applied on the linked project.

**Preferred:** `npx supabase db push --linked --yes` (or `-p "$SUPABASE_DB_PASSWORD"` when login-role fails).

**SQL Editor (works today when CLI hits `cli_login_postgres` permission denied):**

1. Open [SQL Editor](https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new)
2. Paste and run **`apply-chat-threads-messages-manual.sql`**
3. Confirm result rows: `chat_threads` / `chat_messages` → `exists = true`
4. Retry Ask in the web app (hard refresh if the client cached the schema error)

Schema reference: [docs/06-security/highlights-schema.md](../docs/06-security/highlights-schema.md)
