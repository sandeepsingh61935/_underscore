import { describe, expect, it } from 'vitest';

import {
  buildMcpCapabilities,
  type McpCapabilityFlags,
} from '@/shared/utils/mode-capabilities';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';

describe('buildMcpCapabilities', () => {
  it('denies sync and export for a guest in Basic', () => {
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
      collections: true,
      search: false,
      metadataWrite: false,
    });
  });

  it('allows sync and export for signed-in Pro with vault unlocked', () => {
    const caps = buildMcpCapabilities({
      mode: 'pro',
      capabilities: getCapabilitiesForMode('pro'),
      isAuthenticated: true,
      vaultLocked: false,
      storageScope: 'pro',
    });

    expect(caps.sync).toBe(true);
    expect(caps.export).toBe(true);
    expect(caps.search).toBe(true);
    expect(caps.metadataWrite).toBe(true);
    expect(caps.ai).toBe(false);
  });
});
