import { describe, expect, it } from 'vitest';

import {
  fillMcpConfigTemplate,
  getMcpAiApp,
  MCP_AI_APPS,
} from '@/features/settings/mcp/mcp-ai-apps';

describe('MCP_AI_APPS', () => {
  it('lists apps in locked product order including Grok', () => {
    expect(MCP_AI_APPS.map((a) => a.id)).toEqual([
      'claude-code',
      'claude-desktop',
      'codex',
      'chatgpt-desktop',
      'cursor',
      'grok',
      'antigravity',
      'gemini',
      'other',
    ]);
  });

  it('declares handoff kinds without token placeholders', () => {
    expect(getMcpAiApp('cursor').handoff).toBe('deep_link');
    expect(getMcpAiApp('claude-code').handoff).toBe('copy_command');
    expect(getMcpAiApp('codex').handoff).toBe('copy_command');
    expect(getMcpAiApp('chatgpt-desktop').handoff).toBe('copy_url');
    for (const app of MCP_AI_APPS) {
      expect(app.steps.length).toBeGreaterThanOrEqual(3);
      expect(app.steps.some((s) => /return here|connected/i.test(s))).toBe(true);
      expect(app.commandTemplate ?? '').not.toContain('{{TOKEN}}');
      expect(app.configTemplate).not.toContain('{{TOKEN}}');
      expect(`${app.hint} ${app.primaryLabel}`).not.toMatch(/get_session/i);
    }
  });

  it('fills remote Cloud MCP URL in config templates', () => {
    const app = getMcpAiApp('cursor');
    expect(
      fillMcpConfigTemplate(app.configTemplate, 'https://mcp.example/mcp')
    ).toContain('"url": "https://mcp.example/mcp"');
    expect(app.configTemplate).not.toContain('UNDERSCORE_MCP_TOKEN');
    expect(app.configTemplate).not.toContain('{{TOKEN}}');
    expect(app.configTemplate).not.toContain('--adapter=bridge');
  });

  it('Grok uses toml remote URL snippet and amateur hint', () => {
    const app = getMcpAiApp('grok');
    expect(app.name).toBe('Grok (xAI)');
    expect(app.configLabel).toMatch(/grok/i);
    expect(app.restartLabel).toMatch(/restart|reload/i);
    expect(
      fillMcpConfigTemplate(app.configTemplate, 'https://mcp.example/mcp')
    ).toContain('url = "https://mcp.example/mcp"');
    expect(`${app.hint} ${app.configLabel} ${app.restartLabel}`).not.toMatch(
      /jwt|bearer|get_session/i
    );
  });

  it('ChatGPT amateur hint is paste-and-approve, not JWT', () => {
    const app = getMcpAiApp('chatgpt-desktop');
    expect(app.hint).toMatch(/chatgpt connectors/i);
    expect(app.hint).toMatch(/approve/i);
    expect(app.hint).not.toMatch(/jwt|bearer|get_session/i);
  });
});
