-- =============================================================================
-- Bootstrap Supabase CLI migration history + apply pending ai_preferences
-- =============================================================================
-- Why: this project never had `supabase_migrations` (CLI never successfully
-- pushed). Linked `db push` also fails here (cli_login_postgres CREATEROLE).
--
-- This script does what a healthy first `supabase db push` would do:
--   1) create CLI migration history schema/table
--   2) mark older migrations already present on this DB as applied
--   3) apply `20260812120000_ai_preferences` (same as the migration file)
--   4) record that version in history
--
-- Run in: https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new
-- Safe to re-run.
-- =============================================================================

-- 1) CLI migration history (minimal shape used by supabase db push / list)
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY
);

-- 2) Prior migrations already on this remote DB (do not re-execute them)
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260711170000'),
  ('20260713180000'),
  ('20260725120000'),
  ('20260804120000')
ON CONFLICT (version) DO NOTHING;

-- 3) Apply 20260812120000_ai_preferences.sql (idempotent form of the migration file)
CREATE TABLE IF NOT EXISTS public.ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_provider text
    CHECK (
      default_provider IS NULL
      OR default_provider IN ('openai', 'anthropic', 'gemini', 'xai', 'openrouter', 'ollama')
    ),
  models jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_preferences IS
  'Per-user AI prefs for multi-client LWW sync. Models + default + enablement only; '
  'BYOK keys and Ollama base stay on each device.';

COMMENT ON COLUMN public.ai_preferences.models IS
  'JSON map provider → preferred model id. No secrets.';

COMMENT ON COLUMN public.ai_preferences.enabled_providers IS
  'JSON array of provider ids; empty array = all enabled when keys exist.';

CREATE INDEX IF NOT EXISTS ai_preferences_updated_at_idx
  ON public.ai_preferences (updated_at DESC);

ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_preferences FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_preferences'
      AND policyname = 'ai_preferences_select_own'
  ) THEN
    CREATE POLICY ai_preferences_select_own
      ON public.ai_preferences FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_preferences'
      AND policyname = 'ai_preferences_insert_own'
  ) THEN
    CREATE POLICY ai_preferences_insert_own
      ON public.ai_preferences FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_preferences'
      AND policyname = 'ai_preferences_update_own'
  ) THEN
    CREATE POLICY ai_preferences_update_own
      ON public.ai_preferences FOR UPDATE TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_preferences'
      AND policyname = 'ai_preferences_delete_own'
  ) THEN
    CREATE POLICY ai_preferences_delete_own
      ON public.ai_preferences FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 4) Record this migration as applied
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260812120000')
ON CONFLICT (version) DO NOTHING;

-- 5) Verify (expect ai_preferences + five versions including 20260812120000)
SELECT to_regclass('public.ai_preferences') AS ai_preferences_table;
SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version;
