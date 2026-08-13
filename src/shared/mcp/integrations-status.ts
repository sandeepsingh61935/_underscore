export type IntegrationsStatus = 'off' | 'ready' | 'connected';

/** JWT / OAuth MCP success counts as Connected for this long. */
export const RECENT_MCP_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function hasRecentMcpSession(
  lastSuccessAtMs: number | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (lastSuccessAtMs == null || !Number.isFinite(lastSuccessAtMs)) return false;
  const age = nowMs - lastSuccessAtMs;
  return age >= 0 && age < RECENT_MCP_SESSION_MS;
}

export function resolveIntegrationsStatus(input: {
  mcpAllowed: boolean;
  oauthGrantCount: number;
  lastMcpSuccessAtMs?: number | null;
  nowMs?: number;
}): IntegrationsStatus {
  if (!input.mcpAllowed) return 'off';
  if (input.oauthGrantCount > 0) return 'connected';
  if (hasRecentMcpSession(input.lastMcpSuccessAtMs, input.nowMs ?? Date.now())) {
    return 'connected';
  }
  return 'ready';
}

export function integrationsStatusLabel(status: IntegrationsStatus): string {
  switch (status) {
    case 'off':
      return 'Off';
    case 'ready':
      return 'Ready';
    case 'connected':
      return 'Connected';
  }
}
