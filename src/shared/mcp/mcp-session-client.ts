import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { IPC_MCP_LAST_SESSION, type MessageResponse } from '@/shared/schemas/message-schemas';

export function parseMcpLastSuccessAt(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export async function fetchLastMcpSuccessAtMsFromClient(
  select: () => Promise<{ last_success_at?: string | null } | null>,
): Promise<number | null> {
  try {
    const row = await select();
    return parseMcpLastSuccessAt(row?.last_success_at);
  } catch {
    return null;
  }
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
}

export async function fetchLastMcpSuccessAtMs(
  bus: IMessageBus | null,
): Promise<number | null> {
  if (hasChromeRuntime() && bus) {
    const res = await bus.send<MessageResponse<{ lastSuccessAtMs: number | null }>>('background', {
      type: IPC_MCP_LAST_SESSION,
      payload: {},
      timestamp: Date.now(),
    });
    if (!res || !res.success) return null;
    return res.data?.lastSuccessAtMs ?? null;
  }

  try {
    const supabase = getWebSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;
    const { data, error } = await supabase
      .from('mcp_sessions')
      .select('last_success_at')
      .maybeSingle();
    if (error) return null;
    return parseMcpLastSuccessAt(data?.last_success_at);
  } catch {
    return null;
  }
}
