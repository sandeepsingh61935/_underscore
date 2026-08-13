-- Last successful Cloud MCP session per user (ADR-029 Connected = grant OR recent session).

CREATE TABLE public.mcp_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_success_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mcp_sessions IS
  'Cloud MCP access heartbeat. Worker upserts on paid Streamable HTTP success. '
  'Integrations UI treats a row newer than 7 days as Connected even without an OAuth grant.';

ALTER TABLE public.mcp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY mcp_sessions_select_own
  ON public.mcp_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY mcp_sessions_upsert_own
  ON public.mcp_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mcp_sessions_update_own
  ON public.mcp_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
