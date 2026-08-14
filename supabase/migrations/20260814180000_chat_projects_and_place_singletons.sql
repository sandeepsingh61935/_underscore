-- Place-based Ask: projects + project-scoped threads + singleton indexes.
-- Amends ADR-028 UX (one chat per place; projects for multi-domain/section).

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.chat_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled project',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_projects IS
  'Named multi-place grounding bags (domains/sections). One chat thread per project.';

CREATE INDEX chat_projects_user_updated_at_idx
  ON public.chat_projects (user_id, updated_at DESC);

CREATE TABLE public.chat_project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.chat_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_kind text NOT NULL CHECK (member_kind IN ('domain', 'section')),
  domain text NOT NULL,
  section_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_project_members_shape_ck CHECK (
    (member_kind = 'domain' AND section_key IS NULL)
    OR (member_kind = 'section' AND section_key IS NOT NULL)
  )
);

COMMENT ON TABLE public.chat_project_members IS
  'Project grounding members: domain or section under a domain.';

CREATE UNIQUE INDEX chat_project_members_domain_uidx
  ON public.chat_project_members (project_id, domain)
  WHERE member_kind = 'domain';

CREATE UNIQUE INDEX chat_project_members_section_uidx
  ON public.chat_project_members (project_id, domain, section_key)
  WHERE member_kind = 'section';

CREATE INDEX chat_project_members_project_id_idx
  ON public.chat_project_members (project_id);

CREATE INDEX chat_project_members_user_id_idx
  ON public.chat_project_members (user_id);

ALTER TABLE public.chat_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_projects FORCE ROW LEVEL SECURITY;

CREATE POLICY chat_projects_select_own
  ON public.chat_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY chat_projects_insert_own
  ON public.chat_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_projects_update_own
  ON public.chat_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_projects_delete_own
  ON public.chat_projects FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.chat_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_project_members FORCE ROW LEVEL SECURITY;

CREATE POLICY chat_project_members_select_own
  ON public.chat_project_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY chat_project_members_insert_own
  ON public.chat_project_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY chat_project_members_update_own
  ON public.chat_project_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_project_members_delete_own
  ON public.chat_project_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Threads: project scope + singleton uniqueness (keep newest per place)
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.chat_projects(id) ON DELETE CASCADE;

ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_scope_shape_ck;

ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_scope_kind_check;

-- Recreate scope_kind check including project
ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_scope_kind_check
  CHECK (scope_kind IN ('library', 'domain', 'section', 'project'));

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_scope_shape_ck CHECK (
    (scope_kind = 'library' AND domain IS NULL AND section_key IS NULL AND project_id IS NULL)
    OR (scope_kind = 'domain' AND domain IS NOT NULL AND section_key IS NULL AND project_id IS NULL)
    OR (scope_kind = 'section' AND domain IS NOT NULL AND section_key IS NOT NULL AND project_id IS NULL)
    OR (scope_kind = 'project' AND project_id IS NOT NULL AND domain IS NULL AND section_key IS NULL)
  );

-- Deduplicate existing domain/section threads (keep most recently updated)
DELETE FROM public.chat_threads t
USING public.chat_threads newer
WHERE t.scope_kind = 'domain'
  AND newer.scope_kind = 'domain'
  AND t.user_id = newer.user_id
  AND t.domain = newer.domain
  AND t.updated_at < newer.updated_at;

DELETE FROM public.chat_threads t
USING public.chat_threads newer
WHERE t.scope_kind = 'section'
  AND newer.scope_kind = 'section'
  AND t.user_id = newer.user_id
  AND t.domain = newer.domain
  AND t.section_key = newer.section_key
  AND t.updated_at < newer.updated_at;

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_singleton_domain_uidx
  ON public.chat_threads (user_id, domain)
  WHERE scope_kind = 'domain';

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_singleton_section_uidx
  ON public.chat_threads (user_id, domain, section_key)
  WHERE scope_kind = 'section';

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_singleton_project_uidx
  ON public.chat_threads (user_id, project_id)
  WHERE scope_kind = 'project';
