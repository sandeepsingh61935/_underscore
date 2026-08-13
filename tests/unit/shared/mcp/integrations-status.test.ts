import { describe, expect, it } from 'vitest';

import { resolveIntegrationsStatus } from '@/shared/mcp/integrations-status';

describe('resolveIntegrationsStatus', () => {
  it('is Off when Integrations are not entitled', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: false, oauthGrantCount: 2 })).toBe('off');
  });

  it('is Connected when entitled and at least one OAuth client exists', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 1 })).toBe('connected');
  });

  it('is Ready when entitled but no OAuth client', () => {
    expect(resolveIntegrationsStatus({ mcpAllowed: true, oauthGrantCount: 0 })).toBe('ready');
  });
});
