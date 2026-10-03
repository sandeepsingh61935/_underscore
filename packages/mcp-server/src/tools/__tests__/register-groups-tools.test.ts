import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAdapter } from '../../adapters/types.js';
import { registerMcpTools } from '../register-tools.js';

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

describe('registerMcpTools - Groups', () => {
  it('registers list_groups and get_group tools and groups resource', () => {
    const adapter = createMockAdapter({});
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerMcpTools(server, adapter);

    const registeredTools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(Object.keys(registeredTools)).toEqual(
      expect.arrayContaining(['list_groups', 'get_group'])
    );

    const registeredResources = (
      server as unknown as { _registeredResources: Record<string, unknown> }
    )._registeredResources;
    expect(Object.keys(registeredResources)).toEqual(
      expect.arrayContaining(['underscore://groups'])
    );
  });

  it('list_groups tool invokes adapter.dispatch and returns formatted JSON', async () => {
    const mockGroupsData = {
      groups: [
        {
          id: 'grp-1',
          name: 'Project Alpha',
          color: 'blue',
          itemCount: 3,
          state: 'live',
        },
      ],
    };

    const adapter = createMockAdapter({
      list_groups: mockGroupsData,
    });

    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerMcpTools(server, adapter);

    const tool = (server as unknown as { _registeredTools: Record<string, any> })
      ._registeredTools['list_groups'];

    expect(tool).toBeDefined();
    const result = await tool.handler({});
    expect(adapter.dispatch).toHaveBeenCalledWith('list_groups');
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockGroupsData);
  });

  it('get_group tool passes id to adapter.dispatch and returns formatted JSON', async () => {
    const mockGroupData = {
      group: {
        id: 'grp-1',
        name: 'Project Alpha',
        color: 'blue',
        state: 'live',
        items: [],
        resolvedPages: [],
        itemCount: 0,
        totalHighlights: 0,
      },
    };

    const adapter = createMockAdapter({
      get_group: (payload: any) => {
        expect(payload).toEqual({ id: 'grp-1' });
        return mockGroupData;
      },
    });

    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerMcpTools(server, adapter);

    const tool = (server as unknown as { _registeredTools: Record<string, any> })
      ._registeredTools['get_group'];

    expect(tool).toBeDefined();
    const result = await tool.handler({ id: 'grp-1' });
    expect(adapter.dispatch).toHaveBeenCalledWith('get_group', { id: 'grp-1' });
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockGroupData);
  });
});
