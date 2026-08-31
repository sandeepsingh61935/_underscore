/**
 * External MCP hosts for Integrations (cloud-first, ADR-029).
 * Catalog owns Host connection: handoff, steps, URL snippet, restart.
 */

import type { HandoffKind } from '@/features/settings/mcp/mcp-host-handoff';

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
  /** Legacy short line; picker prefers handoffPickerSub(handoff). */
  sub: string;
  handoff: HandoffKind;
  primaryLabel: string;
  /** When handoff is copy_command; {{MCP_URL}} only — no token. */
  commandTemplate?: string;
  /** 3–4 plain steps; OAuth in host, then return for Connected. */
  steps: readonly string[];
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

const STEP_RETURN = 'Return here — status becomes Connected after the agent finishes.';

function stepsOpenApprove(where: string): readonly string[] {
  return [
    where,
    'In the agent: connect or authenticate when prompted.',
    'Allow access in the browser if asked.',
    STEP_RETURN,
  ];
}

function stepsCopyCommand(cli: string): readonly string[] {
  return [
    `Copy the one-line ${cli} install command below.`,
    'Paste and run it in your terminal.',
    'Authenticate or approve when the agent opens a browser.',
    STEP_RETURN,
  ];
}

function stepsCopyUrl(where: string): readonly string[] {
  return [
    'Copy the remote MCP URL.',
    `Paste it in ${where}.`,
    'Approve when the browser opens.',
    STEP_RETURN,
  ];
}

/** Flat picker list — locked order (Claude Code → … → Other MCP). */
export const MCP_AI_APPS: readonly McpAiAppDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    sub: 'CLI · one command',
    handoff: 'copy_command',
    primaryLabel: 'Copy install command',
    commandTemplate: 'claude mcp add --transport http underscore {{MCP_URL}}',
    steps: stepsCopyCommand('Claude Code'),
    configLabel: 'Project .mcp.json (or ~/.claude.json)',
    hint: 'Or add the remote URL in Project .mcp.json (or ~/.claude.json).',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Claude Code / open new session',
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('claude_desktop_config.json'),
    configLabel: 'claude_desktop_config.json',
    hint: 'Paste the remote URL in claude_desktop_config.json.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Quit Claude Desktop fully, then reopen',
  },
  {
    id: 'codex',
    name: 'Codex',
    sub: 'CLI · one command',
    handoff: 'copy_command',
    primaryLabel: 'Copy install command',
    commandTemplate: 'codex mcp add underscore --url {{MCP_URL}}',
    steps: stepsCopyCommand('Codex'),
    configLabel: '~/.codex/config.toml (or: codex mcp add)',
    hint: 'Or paste the remote URL in ~/.codex/config.toml.',
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Codex / start a new session',
  },
  {
    id: 'chatgpt-desktop',
    name: 'ChatGPT',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('ChatGPT Settings → Apps (Developer Mode)'),
    configLabel: 'ChatGPT Settings → Apps (Developer Mode)',
    hint: 'Paste the remote URL in ChatGPT connectors. Approve when the browser opens.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload ChatGPT / start a new chat',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    sub: 'IDE · one-click install',
    handoff: 'deep_link',
    primaryLabel: 'Open in Cursor',
    steps: stepsOpenApprove('Open Cursor with _underscore pre-filled (button below).'),
    configLabel: '~/.cursor/mcp.json',
    hint: 'If Cursor did not open, use Manual to copy the install link or config.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Restart Cursor MCP / reload window',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('Grok Build MCP settings (or ~/.grok/config.toml)'),
    configLabel: '~/.grok/config.toml (or Grok Build MCP settings)',
    hint: 'Paste the remote URL in ~/.grok/config.toml (or Grok Build MCP settings).',
    configTemplate: CLOUD_TOML,
    restartLabel: 'Restart Grok Build / reload MCP servers',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('~/.gemini/antigravity/mcp_config.json'),
    configLabel: '~/.gemini/antigravity/mcp_config.json',
    hint: 'Paste the remote URL in ~/.gemini/antigravity/mcp_config.json.',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload MCP servers in Antigravity',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('Gemini MCP config (path varies by surface)'),
    configLabel: 'Gemini MCP config (path varies by surface)',
    hint: 'Paste the remote URL in Gemini MCP config (path varies by surface).',
    configTemplate: CLOUD_JSON,
    restartLabel: 'Reload Gemini / agent session',
  },
  {
    id: 'other',
    name: 'Other MCP client',
    sub: 'Paste URL in host settings',
    handoff: 'copy_url',
    primaryLabel: 'Copy remote URL',
    steps: stepsCopyUrl('your client’s MCP settings'),
    configLabel: 'Your client’s MCP config',
    hint: 'Paste the remote URL in your client’s MCP config.',
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
  return template.split('{{MCP_URL}}').join(url.trim() || 'https://YOUR-WORKER/mcp');
}
