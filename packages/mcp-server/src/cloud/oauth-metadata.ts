/**
 * MCP OAuth 2.1 protected-resource metadata (RFC 9728) for the cloud worker.
 * Authorization server: Supabase Auth (issuer derived from SUPABASE_URL).
 */

/** Scopes advertised to MCP clients (ChatGPT). Must match Supabase OAuth server support. */
export const MCP_OAUTH_SCOPES = ['openid', 'email', 'profile'] as const;

export type McpOAuthScope = (typeof MCP_OAUTH_SCOPES)[number];

export interface OAuthMetadataEnv {
  SUPABASE_URL?: string;
  /** Optional override; defaults to request origin (workers.dev URL). */
  MCP_RESOURCE_URL?: string;
}

export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: McpOAuthScope[];
  bearer_methods_supported: ['header'];
  resource_documentation: string;
}

const RESOURCE_DOC_URL =
  'https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication';

export function normalizeSupabaseProjectUrl(supabaseUrl: string): string {
  return supabaseUrl.trim().replace(/\/+$/, '');
}

/** Supabase Auth issuer (verified via /.well-known/openid-configuration). */
export function supabaseAuthIssuer(supabaseUrl: string): string {
  return `${normalizeSupabaseProjectUrl(supabaseUrl)}/auth/v1`;
}

/**
 * Canonical MCP resource identifier (RFC 9728 `resource`).
 * Prefer MCP_RESOURCE_URL secret when set (stable across path variants).
 */
export function resolveMcpResourceUrl(request: Request, env: OAuthMetadataEnv): string {
  const override = env.MCP_RESOURCE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/, '');
  }
  const url = new URL(request.url);
  return `${url.origin}${MCP_HTTP_PATH}`;
}

/** MCP Streamable HTTP endpoint path on the cloud worker. */
export const MCP_HTTP_PATH = '/mcp';

export function protectedResourceMetadataPath(): string {
  return '/.well-known/oauth-protected-resource';
}

/**
 * RFC 9728 metadata path when the resource identifier includes a path (e.g. `/mcp`).
 * Resource `https://host/mcp` → `/.well-known/oauth-protected-resource/mcp`
 */
export function protectedResourceMetadataPathForResource(resourceUrl: string): string {
  const parsed = new URL(resourceUrl);
  const resourcePath = parsed.pathname.replace(/\/+$/, '');
  if (!resourcePath || resourcePath === '/') {
    return protectedResourceMetadataPath();
  }
  return `${protectedResourceMetadataPath()}${resourcePath}`;
}

export function isProtectedResourceMetadataRequest(
  pathname: string,
  resourceUrl: string,
): boolean {
  if (pathname === protectedResourceMetadataPath()) {
    return true;
  }
  return pathname === protectedResourceMetadataPathForResource(resourceUrl);
}

export function protectedResourceMetadataUrl(resourceUrl: string): string {
  const parsed = new URL(resourceUrl);
  const metadataPath = protectedResourceMetadataPathForResource(resourceUrl);
  return `${parsed.origin}${metadataPath}`;
}

export function buildProtectedResourceMetadata(
  resourceUrl: string,
  supabaseUrl: string,
): ProtectedResourceMetadata {
  return {
    resource: resourceUrl,
    authorization_servers: [supabaseAuthIssuer(supabaseUrl)],
    scopes_supported: [...MCP_OAUTH_SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: RESOURCE_DOC_URL,
  };
}

export function buildWwwAuthenticateHeader(
  resourceMetadataUrl: string,
  scopes: readonly string[] = MCP_OAUTH_SCOPES,
): string {
  const scope = scopes.join(' ');
  return `Bearer resource_metadata="${resourceMetadataUrl}", scope="${scope}"`;
}

export interface UnauthorizedMcpBody {
  error: 'unauthorized';
  error_description: string;
  _meta: {
    'mcp/www_authenticate': string;
  };
}

export function buildUnauthorizedMcpBody(wwwAuthenticate: string): UnauthorizedMcpBody {
  return {
    error: 'unauthorized',
    error_description:
      'OAuth 2.1 Bearer token required. Connect via ChatGPT OAuth or pass a Supabase access token.',
    _meta: {
      'mcp/www_authenticate': wwwAuthenticate,
    },
  };
}

export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Mcp-Session-Id',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function oauthUnauthorizedResponse(
  request: Request,
  env: OAuthMetadataEnv,
): Response {
  const resourceUrl = resolveMcpResourceUrl(request, env);
  const metadataUrl = protectedResourceMetadataUrl(resourceUrl);
  const wwwAuthenticate = buildWwwAuthenticateHeader(metadataUrl);
  const body = buildUnauthorizedMcpBody(wwwAuthenticate);

  return new Response(JSON.stringify(body), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': wwwAuthenticate,
      'Cache-Control': 'no-store',
    },
  });
}
