import { describe, expect, it } from 'vitest';

import { integrationsStatusDetail } from '@/shared/mcp/integrations-status';

describe('integrationsStatusDetail', () => {
  it('tells a Ready user to add an AI app and approve when asked', () => {
    expect(
      integrationsStatusDetail({ status: 'ready', oauthGrantCount: 0 }),
    ).toMatch(/add an ai app/i);
    expect(
      integrationsStatusDetail({ status: 'ready', oauthGrantCount: 0 }),
    ).toMatch(/approve/i);
    expect(
      integrationsStatusDetail({ status: 'ready', oauthGrantCount: 0 }),
    ).not.toMatch(/copied the snippet|get_session|jwt|bearer/i);
  });

  it('names approved clients when Connected with grants', () => {
    expect(
      integrationsStatusDetail({
        status: 'connected',
        oauthGrantCount: 1,
        grantTitles: ['ChatGPT'],
      }),
    ).toBe('ChatGPT');
  });

  it('does not claim an OAuth client when Connected by session only', () => {
    const detail = integrationsStatusDetail({
      status: 'connected',
      oauthGrantCount: 0,
    });
    expect(detail).toMatch(/your agent reached cloud mcp/i);
    expect(detail).not.toMatch(/oauth client/i);
  });

  it('is empty when Off', () => {
    expect(integrationsStatusDetail({ status: 'off', oauthGrantCount: 2 })).toBe('');
  });
});
