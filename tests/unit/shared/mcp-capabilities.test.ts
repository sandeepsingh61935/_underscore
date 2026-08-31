import { describe, expect, it } from 'vitest';

import {
  buildMcpCapabilities,
  canUseMcp,
  type McpCapabilityFlags,
} from '@/shared/utils/mode-capabilities';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';

describe('buildMcpCapabilities', () => {
  it('zeros all flags for guest Basic (mcp hard gate)', () => {
    const caps = buildMcpCapabilities({
      mode: 'basic',
      capabilities: getCapabilitiesForMode('basic'),
      isAuthenticated: false,
      storageScope: 'basic',
      isPaidActive: false,
    });

    expect(caps).toEqual<McpCapabilityFlags>({
      sync: false,
      export: false,
      ai: false,
      collections: false,
      search: false,
      metadataWrite: false,
    });
  });

  it('allows library MCP flags for signed-in free during free window (ai stays false)', () => {
    const caps = buildMcpCapabilities({
      mode: 'pro',
      capabilities: getCapabilitiesForMode('pro'),
      isAuthenticated: true,
      storageScope: 'pro',
      isPaidActive: false,
    });

    // Free window defaults on — MCP session may expose library ops; no in-app AI.
    expect(caps.sync).toBe(true);
    expect(caps.export).toBe(true);
    expect(caps.search).toBe(true);
    expect(caps.metadataWrite).toBe(true);
    expect(caps.ai).toBe(false);
  });

  it('allows sync/export/search for signed-in Account (Paid); ai always false', () => {
    const caps = buildMcpCapabilities({
      mode: 'pro_xai',
      capabilities: getCapabilitiesForMode('pro_xai'),
      isAuthenticated: true,
      storageScope: 'pro',
      isPaidActive: true,
    });

    expect(caps.sync).toBe(true);
    expect(caps.export).toBe(true);
    expect(caps.search).toBe(true);
    expect(caps.metadataWrite).toBe(true);
    expect(caps.ai).toBe(false);
  });
});

describe('canUseMcp', () => {
  it('denies guests always', () => {
    expect(
      canUseMcp({ isAuthenticated: false, isPaidActive: false }, { freeWindow: true })
        .allowed
    ).toBe(false);
  });

  it('allows signed-in unpaid when free window on', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: false }, { freeWindow: true })
    ).toEqual({ allowed: true });
  });

  it('denies signed-in unpaid when free window off', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: false }, { freeWindow: false })
    ).toEqual({
      allowed: false,
      reason: 'PAID_REQUIRED',
    });
  });

  it('allows signed-in paid without a mode string', () => {
    expect(
      canUseMcp({ isAuthenticated: true, isPaidActive: true }, { freeWindow: false })
        .allowed
    ).toBe(true);
  });
});
