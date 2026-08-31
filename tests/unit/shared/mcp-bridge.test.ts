import { describe, expect, it } from 'vitest';

import { BRIDGE_PROTOCOL_VERSION, isBridgeRequest } from '@/shared/mcp/bridge-protocol';
import { MCP_BRIDGE_PORT, MCP_BRIDGE_WS_URL } from '@/shared/constants/mcp-bridge';

describe('mcp-bridge constants', () => {
  it('uses fixed port 17342', () => {
    expect(MCP_BRIDGE_PORT).toBe(17342);
    expect(MCP_BRIDGE_WS_URL).toBe('ws://127.0.0.1:17342');
  });
});

describe('bridge-protocol', () => {
  it('identifies bridge requests', () => {
    expect(
      isBridgeRequest({ type: 'request', id: '1', method: 'get_session' } as const)
    ).toBe(true);
    expect(isBridgeRequest({ type: 'auth' })).toBe(false);
  });

  it('uses protocol version 1', () => {
    expect(BRIDGE_PROTOCOL_VERSION).toBe(1);
  });
});
