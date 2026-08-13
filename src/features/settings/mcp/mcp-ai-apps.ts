/**
 * External MCP hosts for Integrations (cloud-first, ADR-029).
 * Host tips are secondary; product path is remote Worker URL + OAuth/JWT.
 */

export type McpAiAppId =
  | 'claude-code'
  | 'claude-desktop'
  | 'codex'
  | 'chatgpt-desktop'
  | 'cursor'
  | 'antigravity'
  | 'gemini'
  | 'grok'
  | 'other';

export type McpAuthHint = 'oauth' | 'url';

export interface McpAiAppDef {
  id: McpAiAppId;
  name: string;
  sub: string;
  configLabel: string;
  configHint: string;
  /** Snippet with {{MCP_URL}} placeholder. */
  configTemplate: string;
  restartLabel: string;
  authHint: McpAuthHint;
}

const CLOUD_JSON = `{
  "mcpServers": {
    "underscore": {
      "url": "{{MCP_URL}}"
    }
  }
}`;

const CLOUD_TOML = `[mcp_servers.underscore]
url = "{{MCP_URL}}"`;

/** Flat picker list — locked order (Claude Code → … → Other MCP). */
export const MCP_AI_APPS: readonly McpAiAppDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    sub: 'CLI / IDE · remote MCP',
    configLabel: 'Project .mcp.json (or ~/.claude.json)',
    configHint: 'Remote Cloud MCP. OAuth on supported hosts, or Bearer JWT for scripts.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Claude Code / open new session',
    authHint: 'url',
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    sub: 'Desktop app · remote MCP',
    configLabel: 'claude_desktop_config.json',
    configHint: 'Settings → Developer → Edit Config. Use the remote URL, then fully quit & reopen.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Quit Claude Desktop fully, then reopen',
    authHint: 'url',
  },
  {
    id: 'codex',
    name: 'Codex',
    sub: 'CLI / IDE · remote MCP',
    configLabel: '~/.codex/config.toml (or: codex mcp add)',
    configHint: 'Point Codex at the Cloud MCP URL. OAuth or Bearer JWT.',
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Codex / start a new session',
    authHint: 'url',
  },
  {
    id: 'chatgpt-desktop',
    name: 'ChatGPT',
    sub: 'Developer Mode app · OAuth',
    configLabel: 'ChatGPT Settings → Apps (Developer Mode)',
    configHint: 'Public hosts use OAuth 2.1 against Cloud MCP. Paste the remote URL; do not use a local token.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload ChatGPT / start a new chat',
    authHint: 'oauth',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    sub: 'Agent · remote MCP',
    configLabel: '~/.cursor/mcp.json',
    configHint: 'Agent mode required for tools. Remote URL — no extension token.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Cursor MCP / reload window',
    authHint: 'url',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    sub: 'Grok Build · remote MCP',
    configLabel: '~/.grok/config.toml (or Grok Build MCP settings)',
    configHint: 'Remote Cloud MCP. Local stdio/bridge is legacy and unsupported in this UI.',
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Grok Build / reload MCP servers',
    authHint: 'url',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    sub: 'Google agent platform · remote MCP',
    configLabel: '~/.gemini/antigravity/mcp_config.json',
    configHint: 'Use the remote Cloud MCP URL, not a local bridge.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload MCP servers in Antigravity',
    authHint: 'url',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    sub: 'Gemini / Google agent surfaces with MCP',
    configLabel: 'Gemini MCP config (path varies by surface)',
    configHint: 'Paste the Cloud MCP remote URL your Gemini client expects.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload Gemini / agent session',
    authHint: 'url',
  },
  {
    id: 'other',
    name: 'Other MCP client',
    sub: 'Any MCP host · remote URL',
    configLabel: 'Your client’s MCP config',
    configHint: 'Remote Cloud MCP URL. OAuth for public hosts; Bearer JWT for scripts.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart / reload your MCP client',
    authHint: 'url',
  },
] as const;

export function getMcpAiApp(id: McpAiAppId): McpAiAppDef {
  const found = MCP_AI_APPS.find((app) => app.id === id);
  if (!found) {
    return MCP_AI_APPS[0]!;
  }
  return found;
}

export function fillMcpConfigTemplate(
  template: string,
  vars: string | { url?: string; token?: string } = {},
): string {
  const resolved = typeof vars === 'string' ? { token: vars } : vars;
  return template
    .split('{{MCP_URL}}')
    .join((resolved.url ?? '').trim() || 'https://YOUR-WORKER/mcp')
    .split('{{TOKEN}}')
    .join((resolved.token ?? '').trim() || 'your-code');
}
