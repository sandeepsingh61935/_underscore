-- One-shot apply for remote SQL Editor.
-- Project: cuzwaukxagefyvtxbqmi
-- Dashboard: https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new
--
-- Safe to re-run. Does NOT require supabase_migrations (many projects never created it).

CREATE TABLE IF NOT EXISTS public.ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_provider text
    CHECK (
      default_provider IS NULL
      OR default_provider IN ('openai', 'anthropic', 'gemini', 'xai', 'openrouter', 'ollama')
    ),
  -- { "openai": "gpt-4o-mini", ... } — model ids only, never API keys
  models jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- [] means all in-app providers enabled (app default); else allow-list
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

-- Sanity check (expect: ai_preferences)
SELECT to_regclass('public.ai_preferences') AS ai_preferences_table;
