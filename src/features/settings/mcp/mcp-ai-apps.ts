/**
 * External MCP hosts for Connect to AI (Option B picker).
 * Order is product-locked. Models / Ollama stay under Configure AI providers.
 */

export type McpAiAppId =
  | 'claude-code'
  | 'claude-desktop'
  | 'codex'
  | 'chatgpt-desktop'
  | 'cursor'
  | 'antigravity'
  | 'gemini'
  | 'other';

export interface McpAiAppDef {
  id: McpAiAppId;
  name: string;
  sub: string;
  configLabel: string;
  configHint: string;
  /** Snippet with {{TOKEN}} placeholder replaced at render time. */
  configTemplate: string;
  restartLabel: string;
}

const BRIDGE_JSON = `{
  "mcpServers": {
    "underscore": {
      "command": "node",
      "args": ["/path/to/_underscore/packages/mcp-server/dist/index.js", "--adapter=bridge"],
      "env": { "UNDERSCORE_MCP_TOKEN": "{{TOKEN}}" }
    }
  }
}`;

const BRIDGE_TOML = `[mcp_servers.underscore]
command = "node"
args = ["/path/to/_underscore/packages/mcp-server/dist/index.js", "--adapter=bridge"]

[mcp_servers.underscore.env]
UNDERSCORE_MCP_TOKEN = "{{TOKEN}}"`;

/** Flat picker list — locked order (Claude Code → … → Other MCP). */
export const MCP_AI_APPS: readonly McpAiAppDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    sub: 'CLI / IDE · .mcp.json or ~/.claude.json',
    configLabel: 'Project .mcp.json (or ~/.claude.json)',
    configHint: 'Same JSON family as Desktop — different file.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Restart Claude Code / open new session',
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    sub: 'Desktop app · claude_desktop_config.json',
    configLabel: 'claude_desktop_config.json',
    configHint: 'Settings → Developer → Edit Config, then fully quit & reopen.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Quit Claude Desktop fully, then reopen',
  },
  {
    id: 'codex',
    name: 'Codex',
    sub: 'CLI / IDE · ~/.codex/config.toml',
    configLabel: '~/.codex/config.toml (or: codex mcp add)',
    configHint: 'Shared config with ChatGPT Desktop Codex host.',
    configTemplate: BRIDGE_TOML,
    restartLabel: 'Restart Codex / start a new session',
  },
  {
    id: 'chatgpt-desktop',
    name: 'ChatGPT Desktop',
    sub: 'Desktop Codex host · same config as Codex',
    configLabel: '~/.codex/config.toml',
    configHint: 'Not ChatGPT web Apps/OAuth — local MCP via Codex host.',
    configTemplate: BRIDGE_TOML,
    restartLabel: 'Restart ChatGPT Desktop',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    sub: 'Agent · ~/.cursor/mcp.json',
    configLabel: '~/.cursor/mcp.json',
    configHint: 'Agent mode required for tools.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Restart Cursor MCP / reload window',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    sub: 'Google agent platform · mcp_config.json',
    configLabel: '~/.gemini/antigravity/mcp_config.json',
    configHint: 'Local stdio or remote HTTP — we use the bridge path here.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Reload MCP servers in Antigravity',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    sub: 'Gemini / Google agent surfaces with MCP',
    configLabel: 'Gemini MCP config (path varies by surface)',
    configHint: 'Paste the same bridge block your Gemini client expects.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Reload Gemini / agent session',
  },
  {
    id: 'other',
    name: 'Other MCP client',
    sub: 'Any MCP host · paste generic snippet',
    configLabel: 'Your client’s MCP config',
    configHint: 'No Add-custom form — same bridge + token, your file format.',
    configTemplate: BRIDGE_JSON,
    restartLabel: 'Restart / reload your MCP client',
  },
] as const;

export function getMcpAiApp(id: McpAiAppId): McpAiAppDef {
  const found = MCP_AI_APPS.find((app) => app.id === id);
  if (!found) {
    return MCP_AI_APPS[0]!;
  }
  return found;
}

export function fillMcpConfigTemplate(template: string, token: string): string {
  const value = token.trim() || 'your-code';
  return template.split('{{TOKEN}}').join(value);
}
