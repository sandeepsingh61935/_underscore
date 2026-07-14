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

  it('zeros all flags for signed-in Pro (mcp paid-only)', () => {
    const caps = buildMcpCapabilities({
      mode: 'pro',
      capabilities: getCapabilitiesForMode('pro'),
      isAuthenticated: true,
      storageScope: 'pro',
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

  it('allows sync/export/ai/search for signed-in Account (Paid)', () => {
    const caps = buildMcpCapabilities({
      mode: 'pro_xai',
      capabilities: getCapabilitiesForMode('pro_xai'),
      isAuthenticated: true,
      storageScope: 'pro',
    });

    expect(caps.sync).toBe(true);
    expect(caps.export).toBe(true);
    expect(caps.search).toBe(true);
    expect(caps.metadataWrite).toBe(true);
    expect(caps.ai).toBe(true);
  });
});

describe('canUseMcp', () => {
  it('denies basic and pro', () => {
    expect(
      canUseMcp({
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
      }).allowed,
    ).toBe(false);
    expect(
      canUseMcp({
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
        storageScope: 'pro',
      }),
    ).toEqual({ allowed: false, reason: 'WRONG_MODE' });
  });

  it('allows signed-in pro_xai', () => {
    expect(
      canUseMcp({
        mode: 'pro_xai',
        capabilities: getCapabilitiesForMode('pro_xai'),
        isAuthenticated: true,
        storageScope: 'pro',
      }).allowed,
    ).toBe(true);
  });
});
