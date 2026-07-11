import { describe, expect, it } from 'vitest';

import {
  buildProtectedResourceMetadata,
  buildWwwAuthenticateHeader,
  isProtectedResourceMetadataRequest,
  MCP_HTTP_PATH,
  normalizeSupabaseProjectUrl,
  protectedResourceMetadataPath,
  protectedResourceMetadataPathForResource,
  protectedResourceMetadataUrl,
  resolveMcpResourceUrl,
  supabaseAuthIssuer,
} from '../oauth-metadata.js';

describe('oauth-metadata', () => {
  const supabaseUrl = 'https://cuzwaukxagefyvtxbqmi.supabase.co/';
  const request = new Request('https://underscore-mcp.example.workers.dev/mcp');

  it('normalizes Supabase project URL', () => {
    expect(normalizeSupabaseProjectUrl(supabaseUrl)).toBe(
      'https://cuzwaukxagefyvtxbqmi.supabase.co',
    );
  });

  it('derives Supabase Auth issuer', () => {
    expect(supabaseAuthIssuer(supabaseUrl)).toBe(
      'https://cuzwaukxagefyvtxbqmi.supabase.co/auth/v1',
    );
  });

  it('resolves resource URL with /mcp path by default', () => {
    expect(resolveMcpResourceUrl(request, { SUPABASE_URL: supabaseUrl })).toBe(
      `https://underscore-mcp.example.workers.dev${MCP_HTTP_PATH}`,
    );
  });

  it('prefers MCP_RESOURCE_URL override', () => {
    expect(
      resolveMcpResourceUrl(request, {
        SUPABASE_URL: supabaseUrl,
        MCP_RESOURCE_URL: 'https://custom.example.com/mcp',
      }),
    ).toBe('https://custom.example.com/mcp');
  });

  it('builds protected resource metadata document', () => {
    const resource = `https://underscore-mcp.example.workers.dev${MCP_HTTP_PATH}`;
    const doc = buildProtectedResourceMetadata(resource, supabaseUrl);
    expect(doc.resource).toBe(resource);
    expect(doc.authorization_servers).toEqual([
      'https://cuzwaukxagefyvtxbqmi.supabase.co/auth/v1',
    ]);
    expect(doc.scopes_supported).toContain('openid');
    expect(doc.scopes_supported).not.toContain('highlights:read');
    expect(doc.bearer_methods_supported).toEqual(['header']);
  });

  it('builds RFC 9728 path-suffixed metadata URL for /mcp resource', () => {
    const resource = `https://underscore-mcp.example.workers.dev${MCP_HTTP_PATH}`;
    const metadataUrl = protectedResourceMetadataUrl(resource);
    expect(metadataUrl).toBe(
      `https://underscore-mcp.example.workers.dev/.well-known/oauth-protected-resource${MCP_HTTP_PATH}`,
    );
    expect(protectedResourceMetadataPathForResource(resource)).toBe(
      `/.well-known/oauth-protected-resource${MCP_HTTP_PATH}`,
    );
    expect(isProtectedResourceMetadataRequest(protectedResourceMetadataPath(), resource)).toBe(
      true,
    );
    expect(
      isProtectedResourceMetadataRequest(
        `/.well-known/oauth-protected-resource${MCP_HTTP_PATH}`,
        resource,
      ),
    ).toBe(true);
    const header = buildWwwAuthenticateHeader(metadataUrl);
    expect(header).toContain('resource_metadata="https://underscore-mcp.example.workers.dev');
    expect(header).toContain('scope="openid email profile"');
  });
});
