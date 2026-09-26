import { describe, expect, it } from 'vitest';

import {
  buildProtectedResourceMetadata,
  buildWwwAuthenticateHeader,
  corsPreflightResponse,
  isAllowedMcpOrigin,
  isProtectedResourceMetadataRequest,
  MCP_HTTP_PATH,
  normalizeSupabaseProjectUrl,
  parseMcpAllowedOrigins,
  protectedResourceMetadataPath,
  protectedResourceMetadataPathForResource,
  protectedResourceMetadataUrl,
  resolveMcpResourceUrl,
  supabaseAuthIssuer,
  withCors,
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

  describe('CORS allowlist', () => {
    const allowed = ['https://underscore-web.pages.dev', 'http://127.0.0.1:3000'];

    it('parses MCP_ALLOWED_ORIGINS env (comma-separated, origin-normalized)', () => {
      expect(
        parseMcpAllowedOrigins('https://underscore-web.pages.dev, http://127.0.0.1:3000/'),
      ).toEqual(['https://underscore-web.pages.dev', 'http://127.0.0.1:3000']);
      expect(parseMcpAllowedOrigins(undefined)).toEqual([]);
      expect(parseMcpAllowedOrigins('')).toEqual([]);
    });

    it('allows exact web origins, rejects unknown origins', () => {
      expect(isAllowedMcpOrigin('https://underscore-web.pages.dev', allowed)).toBe(true);
      expect(isAllowedMcpOrigin('https://evil.example.com', allowed)).toBe(false);
      expect(isAllowedMcpOrigin(null, allowed)).toBe(false);
    });

    it('allows the pinned extension ID, rejects other extension IDs', () => {
      expect(
        isAllowedMcpOrigin('chrome-extension://hecejpjekcgpifnemddfmkjmphmgljlm', allowed),
      ).toBe(true);
      expect(isAllowedMcpOrigin('chrome-extension://evilid', allowed)).toBe(false);
    });

    it('echoes the allowlisted origin on preflight with Vary: Origin', () => {
      const req = new Request('https://underscore-mcp.example.workers.dev/mcp', {
        method: 'OPTIONS',
        headers: { Origin: 'https://underscore-web.pages.dev' },
      });
      const res = corsPreflightResponse(req, { MCP_ALLOWED_ORIGINS: allowed.join(',') });
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://underscore-web.pages.dev',
      );
      expect(res.headers.get('Vary')).toBe('Origin');
    });

    it('rejects disallowed preflight origins with 403 and no ACAO header', () => {
      const req = new Request('https://underscore-mcp.example.workers.dev/mcp', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example.com' },
      });
      const res = corsPreflightResponse(req, { MCP_ALLOWED_ORIGINS: allowed.join(',') });
      expect(res.status).toBe(403);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('echoes allowlisted origin on actual responses, omits header without Origin', () => {
      const base = Response.json({ ok: true });
      const req = new Request('https://underscore-mcp.example.workers.dev/mcp', {
        headers: { Origin: 'https://underscore-web.pages.dev' },
      });
      const ok = withCors(base, req, { MCP_ALLOWED_ORIGINS: allowed.join(',') });
      expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://underscore-web.pages.dev',
      );
      expect(ok.headers.get('Vary')).toBe('Origin');

      const noOrigin = withCors(Response.json({ ok: true }), new Request('https://underscore-mcp.example.workers.dev/mcp'), {
        MCP_ALLOWED_ORIGINS: allowed.join(','),
      });
      expect(noOrigin.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(noOrigin.status).toBe(200);
    });
  });
});
