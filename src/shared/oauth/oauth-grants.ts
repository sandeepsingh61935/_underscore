export interface OAuthGrantSummary {
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt?: string;
}

/** Accept array or common API wrappers from GoTrue. */
export function normalizeOAuthGrantPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o['grants'])) return o['grants'] as unknown[];
    if (Array.isArray(o['data'])) return o['data'] as unknown[];
  }
  return [];
}

/**
 * Map one grant row. Supabase OAuthGrant uses client.id + client.name
 * (not client_id). Flat API shapes are also accepted.
 */
export function mapOAuthGrant(raw: Record<string, unknown>): OAuthGrantSummary | null {
  const client = raw['client'] as Record<string, unknown> | undefined;
  const clientId = String(
    client?.['client_id']
      ?? client?.['id']
      ?? raw['client_id']
      ?? '',
  ).trim();
  if (!clientId) {
    return null;
  }

  const scopeRaw = raw['scope'] ?? raw['scopes'];
  const scopes = typeof scopeRaw === 'string'
    ? scopeRaw.split(/\s+/).filter(Boolean)
    : Array.isArray(scopeRaw)
      ? scopeRaw.map(String)
      : [];

  const createdRaw = raw['created_at'] ?? raw['granted_at'];

  return {
    clientId,
    clientName: String(
      client?.['name']
        ?? client?.['client_name']
        ?? raw['client_name']
        ?? clientId,
    ),
    scopes,
    createdAt: typeof createdRaw === 'string' ? createdRaw : undefined,
  };
}

export function mapOAuthGrantList(rows: unknown): OAuthGrantSummary[] {
  return normalizeOAuthGrantPayload(rows)
    .map((row) => mapOAuthGrant(row as Record<string, unknown>))
    .filter((row): row is OAuthGrantSummary => row !== null);
}
