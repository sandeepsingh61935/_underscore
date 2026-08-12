-- Allow xAI (Grok) as default_provider for account AI prefs.

ALTER TABLE public.ai_preferences
  DROP CONSTRAINT IF EXISTS ai_preferences_default_provider_check;

ALTER TABLE public.ai_preferences
  ADD CONSTRAINT ai_preferences_default_provider_check
  CHECK (
    default_provider IS NULL
    OR default_provider IN (
      'openai',
      'anthropic',
      'gemini',
      'openrouter',
      'ollama',
      'xai'
    )
  );
