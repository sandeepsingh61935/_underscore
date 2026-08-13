/**
 * External MCP hosts for Integrations (cloud-first, ADR-029).
 * The catalog is Host connection: amateur hint, URL snippet, restart.
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

export interface McpAiAppDef {
  id: McpAiAppId;
  name: string;
  sub: string;
  configLabel: string;
  /** Amateur paste instruction. No JWT / get_session. */
  hint: string;
  /** Snippet with {{MCP_URL}} placeholder. */
  configTemplate: string;
  restartLabel: string;
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

function pasteHint(where: string): string {
  return `Paste the remote URL in ${where}.`;
}

/** Flat picker list — locked order (Claude Code → … → Other MCP). */
export const MCP_AI_APPS: readonly McpAiAppDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    sub: 'CLI / IDE · remote MCP',
    configLabel: 'Project .mcp.json (or ~/.claude.json)',
    hint: pasteHint('Project .mcp.json (or ~/.claude.json)'),
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Claude Code / open new session',
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    sub: 'Desktop app · remote MCP',
    configLabel: 'claude_desktop_config.json',
    hint: pasteHint('claude_desktop_config.json'),
    configTemplate: CLOUD_JSON,
    restartLabel: 'Quit Claude Desktop fully, then reopen',
  },
  {
    id: 'codex',
    name: 'Codex',
    sub: 'CLI / IDE · remote MCP',
    configLabel: '~/.codex/config.toml (or: codex mcp add)',
    hint: pasteHint('~/.codex/config.toml (or: codex mcp add)'),
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Codex / start a new session',
  },
  {
    id: 'chatgpt-desktop',
    name: 'ChatGPT',
    sub: 'Developer Mode app · OAuth',
    configLabel: 'ChatGPT Settings → Apps (Developer Mode)',
    hint: 'Paste the remote URL in ChatGPT connectors. Approve when the browser opens.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload ChatGPT / start a new chat',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    sub: 'Agent · remote MCP',
    configLabel: '~/.cursor/mcp.json',
    hint: pasteHint('~/.cursor/mcp.json'),
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Cursor MCP / reload window',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    sub: 'Grok Build · remote MCP',
    configLabel: '~/.grok/config.toml (or Grok Build MCP settings)',
    hint: pasteHint('~/.grok/config.toml (or Grok Build MCP settings)'),
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Grok Build / reload MCP servers',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    sub: 'Google agent platform · remote MCP',
    configLabel: '~/.gemini/antigravity/mcp_config.json',
    hint: pasteHint('~/.gemini/antigravity/mcp_config.json'),
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload MCP servers in Antigravity',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    sub: 'Gemini / Google agent surfaces with MCP',
    configLabel: 'Gemini MCP config (path varies by surface)',
    hint: pasteHint('Gemini MCP config (path varies by surface)'),
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload Gemini / agent session',
  },
  {
    id: 'other',
    name: 'Other MCP client',
    sub: 'Any MCP host · remote URL',
    configLabel: 'Your client’s MCP config',
    hint: pasteHint('your client’s MCP config'),
    configTemplate: CLOUD_JSON,
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

export function fillMcpConfigTemplate(template: string, url: string): string {
  return template
    .split('{{MCP_URL}}')
    .join(url.trim() || 'https://YOUR-WORKER/mcp');
}
