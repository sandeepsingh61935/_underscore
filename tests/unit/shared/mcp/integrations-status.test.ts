import { describe, expect, it } from 'vitest';

import { resolveIntegrationsStatus } from '@/shared/mcp/integrations-status';

describe('resolveIntegrationsStatus', () => {
  it('is Off when Integrations are not entitled', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: false, oauthGrantCount: 2 })).toBe('off');
  });

  it('is Connected when entitled and at least one OAuth client exists', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 1 })).toBe('connected');
  });

  it('is Ready when entitled but no OAuth client and no recent session', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 0 })).toBe('ready');
  });

  it('is Connected when entitled and a JWT MCP session succeeded recently', () => {
    const now = 1_700_000_000_000;
    expect(
      resolveIntegrationsStatus({
        mcpAllowed: true,
        oauthGrantCount: 0,
        lastMcpSuccessAtMs: now - 60_000,
        nowMs: now,
      }),
    ).toBe('connected');
  });

  it('is Ready when the last MCP session is older than the recency window', () => {
    const now = 1_700_000_000_000;
    expect(
      resolveIntegrationsStatus({
        mcpAllowed: true,
        oauthGrantCount: 0,
        lastMcpSuccessAtMs: now - 8 * 24 * 60 * 60 * 1000,
        nowMs: now,
      }),
    ).toBe('ready');
  });
});
