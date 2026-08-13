import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAdapter } from '../adapters/types.js';
import { registerChatGptConnectorTools } from './chatgpt-connector-tools.js';

const paginationSchema = {
  limit: z.number().int().min(1).max(200).optional().describe('Page size (default 50, max 200)'),
  cursor: z.string().optional().describe('Opaque pagination cursor from previous response'),
};

export function registerMcpTools(server: McpServer, adapter: McpAdapter): void {
  registerChatGptConnectorTools(server, adapter);

  server.tool(
    'get_session',
    'Returns current _underscore session: mode, storage scope, auth, capabilities, and dataCoverage. Call this first.',
    {},
    async () => {
      const data = await adapter.dispatch('get_session');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'list_collections',
    `List highlight collections grouped by domain. dataCoverage: ${adapter.dataCoverage}.`,
    {},
    async () => {
      const data = await adapter.dispatch('list_collections');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_highlights',
    'Get highlights for a domain. Paginated.',
    {
      domain: z.string().describe('Domain hostname (e.g. github.com)'),
      ...paginationSchema,
    },
    async ({ domain, limit, cursor }) => {
      const data = await adapter.dispatch('get_highlights', { domain, limit, cursor });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'search_highlights',
    'Full-text search across highlight text, notes, tags, and URLs.',
    {
      query: z.string().describe('Search query'),
      domain: z.string().optional().describe('Optional domain filter'),
      ...paginationSchema,
    },
    async ({ query, domain, limit, cursor }) => {
      const data = await adapter.dispatch('search_highlights', { query, domain, limit, cursor });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'export_highlights',
    'Export highlights as markdown for a scope.',
    {
      kind: z.enum(['library', 'domain']).describe('Export scope kind'),
      domain: z.string().optional().describe('Required when kind is domain'),
    },
    async ({ kind, domain }) => {
      const scope = kind === 'domain' ? { kind, domain: domain ?? '' } : { kind: 'library' };
      const data = await adapter.dispatch('export_highlights', { scope });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
