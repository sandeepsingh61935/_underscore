/**
 * MCP extension bridge constants (ADR-023).
 * Shared by extension background client and packages/mcp-server.
 */

export const MCP_BRIDGE_HOST = '127.0.0.1' as const;
export const MCP_BRIDGE_PORT = 17342 as const;
export const MCP_BRIDGE_WS_URL = `ws://${MCP_BRIDGE_HOST}:${MCP_BRIDGE_PORT}` as const;

/** chrome.storage.local keys for MCP bridge user settings. */
export const MCP_BRIDGE_STORAGE_KEYS = {
  enabled: 'underscore_mcp_bridge_enabled',
  token: 'underscore_mcp_bridge_token',
  connectionState: 'underscore_mcp_bridge_connection_state',
} as const;

/** Env var read by MCP Node process for token validation. */
export const MCP_BRIDGE_TOKEN_ENV = 'UNDERSCORE_MCP_TOKEN' as const;
