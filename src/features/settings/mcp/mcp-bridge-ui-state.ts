import { MCP_BRIDGE_STORAGE_KEYS } from '@/shared/constants/mcp-bridge';

/** True when the user still has the old local bridge enabled (migrate notice only). */
export async function readMcpBridgeEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(MCP_BRIDGE_STORAGE_KEYS.enabled);
  return stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true;
}
