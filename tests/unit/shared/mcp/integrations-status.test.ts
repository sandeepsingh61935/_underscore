import { describe, expect, it } from 'vitest';

import { resolveIntegrationsStatus } from '@/shared/mcp/integrations-status';

describe('resolveIntegrationsStatus', () => {
  it('is Off when Integrations are not entitled', () => {
    expect(
      resolveIntegrationsStatus({ mcpAllowed: false, oauthGrantCount: 2, hasRecentSession: true }),
    ).toBe('off');
  });

  it('is Connected when entitled and at least one OAuth client exists', () => {
    expect(
      resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 1, hasRecentSession: false }),
    ).toBe('connected');
  });

  it('is Connected when entitled and a recent MCP session exists', () => {
    expect(
      resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 0, hasRecentSession: true }),
    ).toBe('connected');
  });

  it('is Ready when entitled but no OAuth client and no recent session', () => {
    expect(
      resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 0, hasRecentSession: false }),
    ).toBe('ready');
  });

  it('never treats a copied snippet as Connected', () => {
    expect(
      resolveIntegrationsStatus({
        mcpAllowed: true,
        oauthGrantCount: 0,
        hasRecentSession: false,
        snippetCopied: true,
      }),
    ).toBe('ready');
  });
});
