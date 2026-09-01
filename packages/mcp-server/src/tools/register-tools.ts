import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAdapter } from '../adapters/types.js';
import { registerChatGptConnectorTools } from './chatgpt-connector-tools.js';

const paginationSchema = {
  limit: z.number().int().min(1).max(200).optional().describe('Page size (default 50, max 200)'),
  cursor: z.string().optional().describe('Opaque pagination cursor from previous response'),
};

const readOnlyAnnotation = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function registerMcpTools(server: McpServer, adapter: McpAdapter): void {
  registerChatGptConnectorTools(server, adapter);

  server.tool(
    'get_session',
    'Returns current _underscore session: mode, storage scope, auth, capabilities, and dataCoverage. Call this first.',
    {},
    readOnlyAnnotation,
    async () => {
      const data = await adapter.dispatch('get_session');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'list_collections',
    `List highlight collections grouped by domain. dataCoverage: ${adapter.dataCoverage}.`,
    {},
    readOnlyAnnotation,
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
    readOnlyAnnotation,
    async ({ domain, limit, cursor }) => {
      const data = await adapter.dispatch('get_highlights', { domain, limit, cursor });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_recent_highlights',
    'Fetch recently captured highlights in reverse chronological order.',
    {
      limit: z.number().int().min(1).max(100).optional().describe('Number of highlights to return (default 20, max 100)'),
      sinceDays: z.number().int().min(1).max(365).optional().describe('Optional filter for highlights saved in the last N days'),
      cursor: z.string().optional().describe('Pagination cursor'),
    },
    readOnlyAnnotation,
    async ({ limit, sinceDays, cursor }) => {
      const data = await adapter.dispatch('get_recent_highlights', { limit, sinceDays, cursor });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_page_highlights',
    'Get all highlights and notes captured for a specific web page / exact URL.',
    {
      url: z.string().describe('The full URL of the page (e.g. https://docs.stripe.com/api)'),
      ...paginationSchema,
    },
    readOnlyAnnotation,
    async ({ url, limit, cursor }) => {
      const data = await adapter.dispatch('get_page_highlights', { url, limit, cursor });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_related_highlights',
    'Find highlights related to a topic or query across all domains using keyword relevance scoring.',
    {
      query: z.string().describe('Topic or keywords to find related highlights for'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results to return (default 10)'),
    },
    readOnlyAnnotation,
    async ({ query, limit }) => {
      const data = await adapter.dispatch('get_related_highlights', { query, limit });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'list_tags',
    'List all user-applied tags across the highlight library with usage counts.',
    {},
    readOnlyAnnotation,
    async () => {
      const data = await adapter.dispatch('list_tags');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_highlights_by_tag',
    'Get all highlights labeled with a specific tag.',
    {
      tag: z.string().describe('The tag name to filter by (e.g. "research", "architecture")'),
      ...paginationSchema,
    },
    readOnlyAnnotation,
    async ({ tag, limit, cursor }) => {
      const data = await adapter.dispatch('get_highlights_by_tag', { tag, limit, cursor });
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
    readOnlyAnnotation,
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
    readOnlyAnnotation,
    async ({ kind, domain }) => {
      const scope = kind === 'domain' ? { kind, domain: domain ?? '' } : { kind: 'library' };
      const data = await adapter.dispatch('export_highlights', { scope });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Native MCP Resources ──────────────────────────────────────────────────
  server.resource('recent_highlights', 'underscore://recent', async (uri) => {
    const data = (await adapter.dispatch('get_recent_highlights', { limit: 20 })) as { highlights?: unknown[] };
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(data, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.resource('collections', 'underscore://collections', async (uri) => {
    const data = await adapter.dispatch('list_collections');
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(data, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  });

  // ── Native MCP Prompt Templates ───────────────────────────────────────────
  server.prompt(
    'summarize_domain',
    'Synthesize all highlights from a specific website into key takeaways and insights.',
    {
      domain: z.string().describe('The domain name to summarize (e.g. "github.com")'),
    },
    async ({ domain }) => {
      const data = (await adapter.dispatch('get_highlights', { domain, limit: 100 })) as {
        highlights?: Array<{ text: string; url: string; notes?: string }>;
      };
      const highlightsText = (data.highlights ?? [])
        .map((h, i) => `${i + 1}. "${h.text}" (Source: ${h.url})${h.notes ? `\n   Note: ${h.notes}` : ''}`)
        .join('\n\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze and summarize my saved highlights from "${domain}":\n\n${highlightsText || 'No highlights found for this domain.'}\n\nProvide key takeaways, recurring themes, and practical takeaways.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'review_recent_reading',
    'Review and synthesize recently captured web highlights and notes.',
    {
      days: z.string().optional().describe('Number of days to look back (default "7")'),
    },
    async ({ days }) => {
      const sinceDays = days ? Number.parseInt(days, 10) : 7;
      const data = (await adapter.dispatch('get_recent_highlights', { limit: 50, sinceDays })) as {
        highlights?: Array<{ text: string; domain: string; url: string; notes?: string }>;
      };
      const highlightsText = (data.highlights ?? [])
        .map((h, i) => `${i + 1}. [${h.domain}] "${h.text}"${h.notes ? ` (Note: ${h.notes})` : ''}`)
        .join('\n\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Here are my recent highlights from the past ${sinceDays} days:\n\n${highlightsText || 'No recent highlights found.'}\n\nPlease organize these by topic and provide an executive summary of my recent research.`,
            },
          },
        ],
      };
    },
  );
}
