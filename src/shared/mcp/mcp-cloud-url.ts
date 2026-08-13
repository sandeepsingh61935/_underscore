/** Public Cloud MCP Streamable HTTP URL (ADR-029 product path). */
export function getMcpCloudUrl(): string {
  const fromEnv = import.meta.env.VITE_MCP_CLOUD_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }
  return 'https://YOUR-WORKER/mcp';
}
