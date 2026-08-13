/**
 * Cloudflare Worker entry for _underscore MCP (Streamable HTTP, Pro cloud only).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createClient } from '@supabase/supabase-js';
import { SupabaseMcpAdapter } from '../adapters/supabase-adapter.js';
import { registerMcpTools } from '../tools/register-tools.js';
import { assertPaidCloudMcpAccess } from './paid-gate.js';
import {
  buildProtectedResourceMetadata,
  corsPreflightResponse,
  isProtectedResourceMetadataRequest,
  oauthUnauthorizedResponse,
  protectedResourceMetadataUrl,
  resolveMcpResourceUrl,
  supabaseAuthIssuer,
  withCors,
} from './oauth-metadata.js';

export interface McpWorkerEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Optional stable resource URL for OAuth (defaults to request origin). */
  MCP_RESOURCE_URL?: string;
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function validateWorkerEnv(env: McpWorkerEnv): Response | null {
  const missing: string[] = [];
  if (!env.SUPABASE_URL?.trim()) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY?.trim()) missing.push('SUPABASE_ANON_KEY');
  if (missing.length === 0) return null;

  return Response.json(
    {
      error: 'Worker misconfigured: missing Cloudflare secrets',
      missing,
      hint: 'Run: npx wrangler secret put SUPABASE_URL && npx wrangler secret put SUPABASE_ANON_KEY',
    },
    { status: 503 },
  );
}

function handleOAuthProtectedResource(request: Request, env: McpWorkerEnv): Response {
  const configError = validateWorkerEnv(env);
  if (configError) return withCors(configError);

  const resourceUrl = resolveMcpResourceUrl(request, env);
  const metadata = buildProtectedResourceMetadata(resourceUrl, env.SUPABASE_URL);

  return withCors(
    Response.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    }),
  );
}

function handleHealth(request: Request, env: McpWorkerEnv): Response {
  const configured = Boolean(env.SUPABASE_URL?.trim() && env.SUPABASE_ANON_KEY?.trim());
  const resourceUrl = configured ? resolveMcpResourceUrl(request, env) : undefined;

  return Response.json({
    ok: true,
    service: 'underscore-mcp',
    configured,
    oauth: configured && resourceUrl
      ? {
          resource: resourceUrl,
          protectedResource: protectedResourceMetadataUrl(resourceUrl),
          authorizationServer: supabaseAuthIssuer(env.SUPABASE_URL),
          scopes: ['openid', 'email', 'profile'],
        }
      : undefined,
  });
}

export async function handleMcpRequest(request: Request, env: McpWorkerEnv): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    return handleHealth(request, env);
  }

  const configError = validateWorkerEnv(env);
  const resourceUrl = configError ? undefined : resolveMcpResourceUrl(request, env);

  if (
    request.method === 'GET'
    && resourceUrl
    && isProtectedResourceMetadataRequest(url.pathname, resourceUrl)
  ) {
    return handleOAuthProtectedResource(request, env);
  }

  if (configError) return configError;

  const token = extractBearer(request);
  if (!token) {
    return withCors(oauthUnauthorizedResponse(request, env));
  }

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const paid = await assertPaidCloudMcpAccess({
      getUser: async () => {
        const { data, error } = await supabase.auth.getUser(token);
        return { user: data.user ? { id: data.user.id } : null, error };
      },
      getEntitlement: async (userId) => {
        const { data, error } = await supabase
          .from('billing_entitlements')
          .select('plan, status')
          .eq('user_id', userId)
          .maybeSingle();
        return { data, error };
      },
    });
    if (!paid.ok) {
      if (paid.status === 401) {
        return withCors(oauthUnauthorizedResponse(request, env));
      }
      return withCors(Response.json({ error: paid.error }, { status: paid.status }));
    }

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: env.SUPABASE_URL,
      supabaseAnonKey: env.SUPABASE_ANON_KEY,
      accessToken: token,
    });

    const server = new McpServer({ name: 'underscore-cloud', version: '0.1.0' });
    registerMcpTools(server, adapter);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal worker error';
    return Response.json({ error: message }, { status: 500 });
  }
}
