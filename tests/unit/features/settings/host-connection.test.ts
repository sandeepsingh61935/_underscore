import { describe, expect, it } from 'vitest';

import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import { resolveHostConnection } from '@/features/settings/mcp/host-connection';

describe('resolveHostConnection', () => {
  it('returns paste target, URL snippet, and restart for Grok', () => {
    const tip = resolveHostConnection(
      getMcpAiApp('grok'),
      'https://underscore-mcp.example/mcp',
    );
    expect(tip.pasteTarget).toMatch(/grok/i);
    expect(tip.snippet).toContain('https://underscore-mcp.example/mcp');
    expect(tip.restart).toMatch(/restart|reload/i);
    expect(`${tip.pasteTarget} ${tip.snippet} ${tip.restart}`).not.toMatch(
      /jwt|bearer|get_session|token/i,
    );
  });

  it('fills a URL-only snippet for Cursor with no token placeholder', () => {
    const tip = resolveHostConnection(
      getMcpAiApp('cursor'),
      'https://mcp.example/mcp',
    );
    expect(tip.snippet).toContain('https://mcp.example/mcp');
    expect(tip.snippet).not.toContain('YOUR-WORKER');
    expect(tip.snippet).not.toMatch(/bearer|token/i);
  });

  it('does not put JWT or get_session on ChatGPT host tips', () => {
    const tip = resolveHostConnection(
      getMcpAiApp('chatgpt-desktop'),
      'https://mcp.example/mcp',
    );
    expect(tip.pasteTarget.length).toBeGreaterThan(0);
    expect(`${tip.hint} ${tip.pasteTarget} ${tip.restart}`).not.toMatch(
      /jwt|bearer|get_session/i,
    );
  });
});
