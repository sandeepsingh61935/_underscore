-- One-shot apply for remote SQL Editor (ADR-028 chat tables).
-- Project: cuzwaukxagefyvtxbqmi
-- Dashboard: https://supabase.com/dashboard/project/cuzwaukxagefyvtxbqmi/sql/new
--
-- Safe to re-run. Creates chat_threads + chat_messages + RLS if missing.
-- Prefer: npx supabase db push --linked --yes  (when CLI works)

-- ── threads ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  scope_kind text NOT NULL
    CHECK (scope_kind IN ('library', 'domain', 'section')),
  domain text,
  section_key text,
  last_provider text,
  last_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_scope_shape_ck CHECK (
    (scope_kind = 'library' AND domain IS NULL AND section_key IS NULL)
    OR (scope_kind = 'domain' AND domain IS NOT NULL AND section_key IS NULL)
    OR (scope_kind = 'section' AND domain IS NOT NULL AND section_key IS NOT NULL)
  )
);

COMMENT ON TABLE public.chat_threads IS
  'Grounded Ask threads (ADR-028). Each thread has a library/domain/section scope.';

CREATE INDEX IF NOT EXISTS chat_threads_user_updated_at_idx
  ON public.chat_threads (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS chat_threads_user_id_idx
  ON public.chat_threads (user_id);

-- ── messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  status text NOT NULL
    CHECK (status IN ('completed', 'streaming', 'failed', 'cancelled')),
  provider text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_messages IS
  'Append-only chat messages for grounded threads (ADR-028). System prompts are not stored.';

CREATE INDEX IF NOT EXISTS chat_messages_thread_created_at_idx
  ON public.chat_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx
  ON public.chat_messages (user_id);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx
  ON public.chat_messages (thread_id);

-- ── RLS threads ──────────────────────────────────────────────────────
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_threads'
      AND policyname = 'chat_threads_select_own'
  ) THEN
    CREATE POLICY chat_threads_select_own
      ON public.chat_threads FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_threads'
      AND policyname = 'chat_threads_insert_own'
  ) THEN
    CREATE POLICY chat_threads_insert_own
      ON public.chat_threads FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_threads'
      AND policyname = 'chat_threads_update_own'
  ) THEN
    CREATE POLICY chat_threads_update_own
      ON public.chat_threads FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_threads'
      AND policyname = 'chat_threads_delete_own'
  ) THEN
    CREATE POLICY chat_threads_delete_own
      ON public.chat_threads FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ── RLS messages (owner + thread ownership) ──────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_select_own'
  ) THEN
    CREATE POLICY chat_messages_select_own
      ON public.chat_messages FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.chat_threads t
          WHERE t.id = thread_id AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_insert_own'
  ) THEN
    CREATE POLICY chat_messages_insert_own
      ON public.chat_messages FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.chat_threads t
          WHERE t.id = thread_id AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_update_own'
  ) THEN
    CREATE POLICY chat_messages_update_own
      ON public.chat_messages FOR UPDATE TO authenticated
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.chat_threads t
          WHERE t.id = thread_id AND t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.chat_threads t
          WHERE t.id = thread_id AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_delete_own'
  ) THEN
    CREATE POLICY chat_messages_delete_own
      ON public.chat_messages FOR DELETE TO authenticated
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.chat_threads t
          WHERE t.id = thread_id AND t.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Record version when CLI history table exists (no-op otherwise).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
  ) THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
    VALUES (
      '20260812160000',
      'chat_threads_messages',
      ARRAY['-- applied via apply-chat-threads-messages-manual.sql']
    )
    ON CONFLICT (version) DO NOTHING;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN
    -- Older history shape: version only
    BEGIN
      INSERT INTO supabase_migrations.schema_migrations (version)
      VALUES ('20260812160000')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Verify
SELECT
  'chat_threads' AS table_name,
  to_regclass('public.chat_threads') IS NOT NULL AS exists
UNION ALL
SELECT
  'chat_messages',
  to_regclass('public.chat_messages') IS NOT NULL;
