import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';
import {
  MCP_BRIDGE_STORAGE_KEYS,
} from '@/shared/constants/mcp-bridge';
import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { MCP_AI_APPS } from '@/features/settings/mcp/mcp-ai-apps';

export interface McpBridgeUiState {
  enabled: boolean;
  token: string;
  connectionState: BridgeConnectionState;
  activeApps: McpAiAppId[];
}

function parseConnectionState(raw: unknown): BridgeConnectionState {
  if (raw === 'connected' || raw === 'connecting' || raw === 'error') {
    return raw;
  }
  return 'disconnected';
}

function parseActiveApps(raw: unknown): McpAiAppId[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(MCP_AI_APPS.map((a) => a.id));
  return raw.filter((id): id is McpAiAppId => typeof id === 'string' && known.has(id as McpAiAppId));
}

export async function readMcpBridgeUiState(): Promise<McpBridgeUiState> {
  const stored = await chrome.storage.local.get([
    MCP_BRIDGE_STORAGE_KEYS.enabled,
    MCP_BRIDGE_STORAGE_KEYS.token,
    MCP_BRIDGE_STORAGE_KEYS.connectionState,
    MCP_BRIDGE_STORAGE_KEYS.activeApps,
  ]);

  return {
    enabled: stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true,
    token: typeof stored[MCP_BRIDGE_STORAGE_KEYS.token] === 'string'
      ? (stored[MCP_BRIDGE_STORAGE_KEYS.token] as string)
      : '',
    connectionState: parseConnectionState(stored[MCP_BRIDGE_STORAGE_KEYS.connectionState]),
    activeApps: parseActiveApps(stored[MCP_BRIDGE_STORAGE_KEYS.activeApps]),
  };
}

export async function persistMcpBridgeEnabled(enabled: boolean, token: string): Promise<void> {
  await chrome.storage.local.set({
    [MCP_BRIDGE_STORAGE_KEYS.enabled]: enabled,
    [MCP_BRIDGE_STORAGE_KEYS.token]: token.trim(),
  });
}

export async function persistMcpBridgeToken(token: string, enabled: boolean): Promise<void> {
  await chrome.storage.local.set({
    [MCP_BRIDGE_STORAGE_KEYS.enabled]: enabled,
    [MCP_BRIDGE_STORAGE_KEYS.token]: token.trim(),
  });
}

export async function markMcpAppActive(appId: McpAiAppId): Promise<McpAiAppId[]> {
  const state = await readMcpBridgeUiState();
  const next = state.activeApps.includes(appId)
    ? state.activeApps
    : [...state.activeApps, appId];
  await chrome.storage.local.set({
    [MCP_BRIDGE_STORAGE_KEYS.activeApps]: next,
  });
  return next;
}
