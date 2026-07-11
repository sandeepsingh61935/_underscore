import { describe, expect, it } from 'vitest';

import { handleMcpRequest, type McpWorkerEnv } from '../worker.js';

const env: McpWorkerEnv = {
  SUPABASE_URL: 'https://cuzwaukxagefyvtxbqmi.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
};

describe('handleMcpRequest OAuth routes', () => {
  it('returns protected resource metadata at path-suffixed well-known URL', async () => {
    const response = await handleMcpRequest(
      new Request(
        'https://underscore-mcp.test.workers.dev/.well-known/oauth-protected-resource/mcp',
      ),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(body.resource).toBe('https://underscore-mcp.test.workers.dev/mcp');
    expect(body.authorization_servers[0]).toBe(
      'https://cuzwaukxagefyvtxbqmi.supabase.co/auth/v1',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns protected resource metadata at legacy well-known URL', async () => {
    const response = await handleMcpRequest(
      new Request('https://underscore-mcp.test.workers.dev/.well-known/oauth-protected-resource'),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { resource: string };
    expect(body.resource).toBe('https://underscore-mcp.test.workers.dev/mcp');
  });

  it('returns 401 with WWW-Authenticate on /mcp without token', async () => {
    const response = await handleMcpRequest(
      new Request('https://underscore-mcp.test.workers.dev/mcp', { method: 'POST' }),
      env,
    );
    expect(response.status).toBe(401);
    const wwwAuth = response.headers.get('WWW-Authenticate');
    expect(wwwAuth).toContain('resource_metadata=');
    expect(wwwAuth).toContain('oauth-protected-resource/mcp');
    const body = (await response.json()) as { error: string; _meta: Record<string, string> };
    expect(body.error).toBe('unauthorized');
    expect(body._meta['mcp/www_authenticate']).toBe(wwwAuth);
  });

  it('includes oauth block on /health when configured', async () => {
    const response = await handleMcpRequest(
      new Request('https://underscore-mcp.test.workers.dev/health'),
      env,
    );
    const body = (await response.json()) as {
      oauth?: { resource: string; protectedResource: string; authorizationServer: string };
    };
    expect(body.oauth?.resource).toBe('https://underscore-mcp.test.workers.dev/mcp');
    expect(body.oauth?.protectedResource).toContain('oauth-protected-resource/mcp');
    expect(body.oauth?.authorizationServer).toContain('/auth/v1');
  });
});
