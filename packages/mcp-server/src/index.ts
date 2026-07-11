#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BridgeMcpAdapter } from './adapters/bridge-adapter.js';
import { SupabaseMcpAdapter } from './adapters/supabase-adapter.js';
import { ExtensionBridgeWsServer } from './bridge/ws-server.js';
import { MCP_BRIDGE_TOKEN_ENV } from './constants/bridge.js';
import { registerMcpTools } from './tools/register-tools.js';
import type { McpAdapter } from './adapters/types.js';

function resolveToken(): string {
  const fromEnv = process.env[MCP_BRIDGE_TOKEN_ENV]?.trim();
  if (fromEnv) return fromEnv;
  const generated = randomBytes(24).toString('hex');
  console.error(`[underscore-mcp] Generated session token (set ${MCP_BRIDGE_TOKEN_ENV}): ${generated}`);
  return generated;
}

async function createAdapter(): Promise<{ adapter: McpAdapter; cleanup?: () => void }> {
  const adapterArg = process.argv.find((a) => a.startsWith('--adapter='))?.split('=')[1]
    ?? (process.argv.includes('--adapter') ? process.argv[process.argv.indexOf('--adapter') + 1] : 'bridge');

  if (adapterArg === 'cloud') {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!url || !anonKey || !token) {
      throw new Error('Cloud adapter requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN');
    }
    return { adapter: new SupabaseMcpAdapter({ supabaseUrl: url, supabaseAnonKey: anonKey, accessToken: token }) };
  }

  const token = resolveToken();
  const bridge = new ExtensionBridgeWsServer(token);
  await bridge.start();
  return {
    adapter: new BridgeMcpAdapter(bridge),
    cleanup: () => bridge.stop(),
  };
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
