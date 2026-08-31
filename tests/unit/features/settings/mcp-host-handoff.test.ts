import { describe, expect, it } from 'vitest';

import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import {
  buildCursorMcpInstallLink,
  decodeJsonBase64,
  fillCommandTemplate,
  handoffPickerSub,
  resolvePrimaryAction,
} from '@/features/settings/mcp/mcp-host-handoff';

const MCP_URL = 'https://underscore-mcp.sandeepss128961.workers.dev/mcp';

function queryParam(href: string, key: string): string | null {
  const q = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  const params = new URLSearchParams(q);
  return params.get(key);
}

describe('mcp-host-handoff', () => {
  it('builds a Cursor deep link with URL-only base64 config (no token)', () => {
    const href = buildCursorMcpInstallLink('_underscore', MCP_URL);
    expect(href.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?')).toBe(true);
    expect(queryParam(href, 'name')).toBe('_underscore');
    const config = decodeJsonBase64<{ url: string }>(queryParam(href, 'config') ?? '');
    expect(config).toEqual({ url: MCP_URL });
    expect(JSON.stringify(config)).not.toMatch(/token|bearer|jwt/i);
  });

  it('fills command templates with the remote URL only', () => {
    expect(
      fillCommandTemplate(
        'claude mcp add --transport http underscore {{MCP_URL}}',
        MCP_URL
      )
    ).toBe(`claude mcp add --transport http underscore ${MCP_URL}`);
  });

  it('resolves Cursor to Open in Cursor deep link', () => {
    const action = resolvePrimaryAction(getMcpAiApp('cursor'), MCP_URL);
    expect(action.kind).toBe('deep_link');
    expect(action.label).toBe('Open in Cursor');
    if (action.kind === 'deep_link') {
      expect(action.href).toContain('cursor://anysphere.cursor-deeplink/mcp/install');
      expect(decodeJsonBase64(queryParam(action.href, 'config') ?? '')).toEqual({
        url: MCP_URL,
      });
    }
  });

  it('resolves Claude Code and Codex to install commands', () => {
    const claude = resolvePrimaryAction(getMcpAiApp('claude-code'), MCP_URL);
    expect(claude).toEqual({
      kind: 'copy_command',
      label: 'Copy install command',
      text: `claude mcp add --transport http underscore ${MCP_URL}`,
    });
    const codex = resolvePrimaryAction(getMcpAiApp('codex'), MCP_URL);
    expect(codex).toEqual({
      kind: 'copy_command',
      label: 'Copy install command',
      text: `codex mcp add underscore --url ${MCP_URL}`,
    });
  });

  it('resolves ChatGPT and Other to copy remote URL', () => {
    const chatgpt = resolvePrimaryAction(getMcpAiApp('chatgpt-desktop'), MCP_URL);
    expect(chatgpt).toEqual({
      kind: 'copy_url',
      label: 'Copy remote URL',
      text: MCP_URL,
    });
    expect(resolvePrimaryAction(getMcpAiApp('other'), MCP_URL).kind).toBe('copy_url');
  });

  it('maps handoff kinds to picker sublines', () => {
    expect(handoffPickerSub('deep_link')).toMatch(/one-click/i);
    expect(handoffPickerSub('copy_command')).toMatch(/one command/i);
    expect(handoffPickerSub('copy_url')).toMatch(/paste url/i);
  });
});
