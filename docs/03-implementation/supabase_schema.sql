-- 1. Create Highlights Table
CREATE TABLE public.highlights (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    text TEXT NOT NULL,
    color_role TEXT NOT NULL,
    selectors JSONB,
    content_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Indexes for performance
    CONSTRAINT highlights_id_unique UNIQUE(id)
);

CREATE INDEX idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX idx_highlights_url ON public.highlights(url);

-- 2. Create Sync Events Table (Event Sourcing)
CREATE TABLE public.sync_events (
    event_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    device_id TEXT NOT NULL,
    vector_clock JSONB NOT NULL,
    checksum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_events_user_timestamp ON public.sync_events(user_id, timestamp);

-- 3. Create Collections Table
CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);

-- 4. Enable Realtime for Highlights
-- Go to Database -> Replication -> supabase_realtime publication
-- Or run this SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.highlights;

-- 5. Row Level Security (RLS)
-- Highlights
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own highlights" ON public.highlights
    FOR ALL USING (auth.uid() = user_id);

-- Sync Events
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own sync events" ON public.sync_events
    FOR ALL USING (auth.uid() = user_id);

-- Collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own collections" ON public.collections
    FOR ALL USING (auth.uid() = user_id);

-- 6. public.verify_rls() RPC
-- Lets anon/authenticated roles read RLS status + policy count for the
-- three protected tables. PostgREST does not expose pg_catalog by default
-- on Supabase Cloud, so the runtime tripwire in SupabaseClient.verifyRls()
-- cannot query pg_policies directly. This RPC is SECURITY DEFINER — runs
-- as the function owner (catalog access), exposed to anon/authenticated.
-- See ADR-016 + docs/06-security/rls-policies.md "Known limitation".
CREATE OR REPLACE FUNCTION public.verify_rls()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        c.relname::text AS table_name,
        c.relrowsecurity AS rls_enabled,
        (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('highlights', 'sync_events', 'collections')
    ORDER BY c.relname;
$$;

REVOKE ALL ON FUNCTION public.verify_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_rls() TO anon, authenticated;
