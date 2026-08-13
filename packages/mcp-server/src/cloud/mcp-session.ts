import type { SupabaseClient } from '@supabase/supabase-js';

/** Best-effort heartbeat. Missing table must not fail the MCP request. */
export async function recordMcpSessionSuccess(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    await client.from('mcp_sessions').upsert(
      { user_id: userId, last_success_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  } catch {
    // table not migrated / RLS miss
  }
}
