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
    `List highlight collections grouped by domain. dataCoverage: ${adapter.dataCoverage}. Basic highlights are only visible via the extension bridge adapter.`,
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

  if (adapter.name === 'bridge') {
    registerBridgeOnlyTools(server, adapter);
  }
}

function registerBridgeOnlyTools(server: McpServer, adapter: McpAdapter): void {
  server.tool(
    'sync_library',
    'Pull cloud highlights into local Pro storage. Requires sign-in.',
    {},
    async () => {
      const data = await adapter.dispatch('sync_library');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_sync_status',
    'Last library hydration timestamp and auth state.',
    {},
    async () => {
      const data = await adapter.dispatch('get_sync_status');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_mode',
    'Get current highlight mode (basic, pro, pro_xai).',
    {},
    async () => {
      const data = await adapter.dispatch('get_mode');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'set_mode',
    'Switch highlight mode. Auth rules apply (Pro requires sign-in; Basic blocked when signed in).',
    {
      mode: z.enum(['basic', 'pro', 'pro_xai']),
    },
    async ({ mode }) => {
      const data = await adapter.dispatch('set_mode', { mode });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'update_highlight_metadata',
    'Update notes and tags on a highlight.',
    {
      id: z.string(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ id, notes, tags }) => {
      const data = await adapter.dispatch('update_highlight_metadata', { id, notes, tags });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'ask_scope',
    'Q&A over highlights in a domain section. Requires pro_xai mode. Default: context-only; set useOrchestrator for extension LLM.',
    {
      domain: z.string(),
      sectionKey: z.string(),
      question: z.string(),
      useOrchestrator: z.boolean().optional(),
    },
    async (args) => {
      const data = await adapter.dispatch('ask_scope', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'summarize_section',
    'Summarize highlights in a domain section. Requires pro_xai. Default context-only.',
    {
      domain: z.string(),
      sectionKey: z.string(),
      useOrchestrator: z.boolean().optional(),
    },
    async (args) => {
      const data = await adapter.dispatch('summarize_section', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'synthesize_domain',
    'Synthesize themes across a domain. Requires pro_xai. Default context-only.',
    {
      domain: z.string(),
      useOrchestrator: z.boolean().optional(),
    },
    async (args) => {
      const data = await adapter.dispatch('synthesize_domain', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
