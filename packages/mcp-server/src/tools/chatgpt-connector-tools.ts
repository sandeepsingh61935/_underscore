import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAdapter } from '../adapters/types.js';

interface HighlightSummary {
  id: string;
  text: string;
  url: string;
  domain: string;
  notes?: string;
  tags?: string[];
}

interface SearchHighlightsResult {
  highlights: HighlightSummary[];
}

function titleFromHighlight(hl: HighlightSummary): string {
  const snippet = hl.text.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (snippet) return snippet;
  if (hl.domain) return `Highlight on ${hl.domain}`;
  return `Highlight ${hl.id.slice(0, 8)}`;
}

function bodyFromHighlight(hl: HighlightSummary): string {
  const parts = [hl.text.trim()];
  if (hl.notes?.trim()) parts.push(`Notes: ${hl.notes.trim()}`);
  if (hl.tags?.length) parts.push(`Tags: ${hl.tags.join(', ')}`);
  return parts.filter(Boolean).join('\n\n');
}

function chatGptToolResult(structuredContent: Record<string, unknown>) {
  return {
    structuredContent,
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
  };
}

const readOnlyAnnotation = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * ChatGPT connectors require `search` and `fetch` tools with MCP-standard inputs.
 * @see https://developers.openai.com/apps-sdk/build/mcp-server#company-knowledge-compatibility
 */
export function registerChatGptConnectorTools(server: McpServer, adapter: McpAdapter): void {
  server.tool(
    'search',
    'Search _underscore highlights. Required for ChatGPT connector compatibility.',
    { query: z.string().describe('Search query') },
    readOnlyAnnotation,
    async ({ query }) => {
      const data = (await adapter.dispatch('search_highlights', {
        query,
        limit: 20,
      })) as SearchHighlightsResult;

      const structuredContent = {
        results: (data.highlights ?? []).map((hl) => ({
          id: hl.id,
          title: titleFromHighlight(hl),
          url: hl.url || '',
        })),
      };

      return chatGptToolResult(structuredContent);
    },
  );

  server.tool(
    'fetch',
    'Fetch a highlight by ID from search results. Required for ChatGPT connector compatibility.',
    { id: z.string().describe('Highlight ID from search results') },
    readOnlyAnnotation,
    async ({ id }) => {
      const hl = (await adapter.dispatch('fetch_highlight', { id })) as HighlightSummary;

      const structuredContent = {
        id: hl.id,
        title: titleFromHighlight(hl),
        text: bodyFromHighlight(hl),
        url: hl.url || '',
        metadata: {
          domain: hl.domain,
          ...(hl.tags?.length ? { tags: hl.tags.join(', ') } : {}),
        },
      };

      return chatGptToolResult(structuredContent);
    },
  );
}
