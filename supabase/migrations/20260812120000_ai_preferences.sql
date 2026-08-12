-- Account-synced AI preferences (default model + enablement). Secrets stay device-local.
-- LWW by updated_at (client clock). Spec: 2026-08-12-ai-integrations-ia-standard.md Phase 3.

CREATE TABLE public.ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_provider text
    CHECK (
      default_provider IS NULL
      OR default_provider IN ('openai', 'anthropic', 'gemini', 'openrouter', 'ollama')
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

CREATE INDEX ai_preferences_updated_at_idx
  ON public.ai_preferences (updated_at DESC);

ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_preferences_select_own
  ON public.ai_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY ai_preferences_insert_own
  ON public.ai_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_preferences_update_own
  ON public.ai_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_preferences_delete_own
  ON public.ai_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
