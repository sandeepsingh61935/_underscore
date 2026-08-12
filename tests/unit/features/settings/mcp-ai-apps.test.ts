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

  it('fills token placeholder in config templates', () => {
    const app = getMcpAiApp('cursor');
    expect(fillMcpConfigTemplate(app.configTemplate, 'abc123')).toContain('"UNDERSCORE_MCP_TOKEN": "abc123"');
  });

  it('Grok uses toml bridge snippet', () => {
    const app = getMcpAiApp('grok');
    expect(app.name).toBe('Grok (xAI)');
    expect(fillMcpConfigTemplate(app.configTemplate, 'tok')).toContain('UNDERSCORE_MCP_TOKEN = "tok"');
  });
});
