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

  it('fills remote Cloud MCP URL in config templates', () => {
    const app = getMcpAiApp('cursor');
    expect(fillMcpConfigTemplate(app.configTemplate, 'https://mcp.example/mcp')).toContain(
      '"url": "https://mcp.example/mcp"',
    );
    expect(app.configTemplate).not.toContain('UNDERSCORE_MCP_TOKEN');
    expect(app.configTemplate).not.toContain('{{TOKEN}}');
    expect(app.configTemplate).not.toContain('--adapter=bridge');
  });

  it('Grok uses toml remote URL snippet and amateur hint', () => {
    const app = getMcpAiApp('grok');
    expect(app.name).toBe('Grok (xAI)');
    expect(app.configLabel).toMatch(/grok/i);
    expect(app.restartLabel).toMatch(/restart|reload/i);
    expect(fillMcpConfigTemplate(app.configTemplate, 'https://mcp.example/mcp')).toContain(
      'url = "https://mcp.example/mcp"',
    );
    expect(`${app.hint} ${app.configLabel} ${app.restartLabel}`).not.toMatch(
      /jwt|bearer|get_session/i,
    );
  });

  it('ChatGPT amateur hint is paste-and-approve, not JWT', () => {
    const app = getMcpAiApp('chatgpt-desktop');
    expect(app.hint).toMatch(/chatgpt connectors/i);
    expect(app.hint).toMatch(/approve/i);
    expect(app.hint).not.toMatch(/jwt|bearer|get_session/i);
  });
});
