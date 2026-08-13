#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SupabaseMcpAdapter } from './adapters/supabase-adapter.js';
import { registerMcpTools } from './tools/register-tools.js';
import type { McpAdapter } from './adapters/types.js';

async function createAdapter(): Promise<{ adapter: McpAdapter; cleanup?: () => void }> {
  const adapterArg = process.argv.find((a) => a.startsWith('--adapter='))?.split('=')[1]
    ?? (process.argv.includes('--adapter') ? process.argv[process.argv.indexOf('--adapter') + 1] : 'cloud');

  if (adapterArg === 'bridge') {
    throw new Error(
      'The local MCP bridge was removed (ADR-029). Use Cloud MCP: the Worker URL + OAuth or Bearer JWT. See packages/mcp-server/README.md',
    );
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!url || !anonKey || !token) {
    throw new Error('Cloud adapter requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN');
  }
  return { adapter: new SupabaseMcpAdapter({ supabaseUrl: url, supabaseAnonKey: anonKey, accessToken: token }) };
}

async function main(): Promise<void> {
  const { adapter, cleanup } = await createAdapter();

  const server = new McpServer({
    name: 'underscore',
    version: '0.1.0',
  });

  registerMcpTools(server, adapter);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', () => {
    cleanup?.();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[underscore-mcp] Fatal:', err);
  process.exit(1);
});
