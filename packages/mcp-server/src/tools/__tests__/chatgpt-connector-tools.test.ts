import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAdapter } from '../../adapters/types.js';
import { registerChatGptConnectorTools } from '../chatgpt-connector-tools.js';

function createMockAdapter(methods: Record<string, unknown>): McpAdapter {
  return {
    name: 'cloud',
    dataCoverage: 'pro_cloud',
    isReady: () => true,
    dispatch: vi.fn(async (method: string, payload?: unknown) => {
      const handler = methods[method];
      if (typeof handler === 'function') {
        return handler(payload);
      }
      if (method in methods) {
        return methods[method];
      }
      throw new Error(`Unknown method: ${method}`);
    }),
  };
}

describe('registerChatGptConnectorTools', () => {
  it('registers search and fetch tools on the MCP server', () => {
    const adapter = createMockAdapter({});
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerChatGptConnectorTools(server, adapter);

    const registered = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(Object.keys(registered)).toEqual(expect.arrayContaining(['search', 'fetch']));
  });
});
