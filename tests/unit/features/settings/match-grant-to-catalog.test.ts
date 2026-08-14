import { describe, expect, it } from 'vitest';

import {
  catalogAppIdsWithGrants,
  matchGrantNameToAppId,
} from '@/features/settings/mcp/match-grant-to-catalog';

describe('matchGrantNameToAppId', () => {
  it('matches Grok and ChatGPT client names to catalog ids', () => {
    expect(matchGrantNameToAppId('Grok')).toBe('grok');
    expect(matchGrantNameToAppId('ChatGPT')).toBe('chatgpt-desktop');
    expect(matchGrantNameToAppId('Cursor')).toBe('cursor');
  });

  it('returns null for unknown local clients', () => {
    expect(matchGrantNameToAppId('Local Development Client')).toBeNull();
  });

  it('builds a set of connected catalog ids from grants', () => {
    const ids = catalogAppIdsWithGrants([
      { clientId: '1', clientName: 'Grok', scopes: [] },
      { clientId: '2', clientName: 'Unknown Tool', scopes: [] },
    ]);
    expect(ids.has('grok')).toBe(true);
    expect(ids.size).toBe(1);
  });
});
