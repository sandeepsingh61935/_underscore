# Supabase migrations

## One-time CLI auth

```bash
npx supabase login
```

Opens browser (or paste an access token from [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens)).

Alternatively: `export SUPABASE_ACCESS_TOKEN=sbp_...`

## Link + push (this repo)

Migration already exists — **do not** run `supabase migration new` unless adding a new change.

```bash
cd /home/sandy/projects/_underscore

# Link local supabase/ to remote project
npx supabase link --project-ref cuzwaukxagefyvtxbqmi

# Apply all pending migrations
npx supabase db push --linked --yes
```

Or via npm scripts (after login):

```bash
npm run supabase:migrate
```

## Manual fallback (SQL Editor)

Paste `20260711170000_highlights_metadata_and_schema_align.sql` into **Supabase Dashboard → SQL Editor → Run**.

## Migrations

| File | Purpose |
|------|---------|
| `20260711170000_highlights_metadata_and_schema_align.sql` | `metadata` JSONB (notes/tags), core column align |
| `20260812120000_ai_preferences.sql` | Account AI prefs (default model + enablement), LWW, RLS |

Schema reference: [docs/06-security/highlights-schema.md](../docs/06-security/highlights-schema.md)
