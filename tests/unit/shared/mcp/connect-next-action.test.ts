import { describe, expect, it } from 'vitest';

import { resolveConnectAction } from '@/shared/mcp/connect-next-action';

describe('resolveConnectAction', () => {
  it('is locked when Integrations are not entitled', () => {
    expect(resolveConnectAction({ mcpAllowed: false, urlCopied: false })).toEqual({
      kind: 'locked',
    });
  });

  it('is locked even if a copy just happened', () => {
    expect(resolveConnectAction({ mcpAllowed: false, urlCopied: true })).toEqual({
      kind: 'locked',
    });
  });

  it('shows Connect when entitled and the URL is not freshly copied', () => {
    expect(resolveConnectAction({ mcpAllowed: true, urlCopied: false })).toEqual({
      kind: 'connect',
    });
  });

  it('shows Copied after a successful copy and stays available when already Connected', () => {
    expect(resolveConnectAction({ mcpAllowed: true, urlCopied: true })).toEqual({
      kind: 'copied',
    });
  });
});
