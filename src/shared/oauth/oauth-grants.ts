export interface OAuthGrantSummary {
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt?: string;
}

export function mapOAuthGrant(raw: Record<string, unknown>): OAuthGrantSummary | null {
  const client = raw['client'] as Record<string, unknown> | undefined;
  const clientId = String(client?.['client_id'] ?? raw['client_id'] ?? '').trim();
  if (!clientId) {
    return null;
  }

  const scopeRaw = raw['scope'] ?? raw['scopes'];
  const scopes = typeof scopeRaw === 'string'
    ? scopeRaw.split(/\s+/).filter(Boolean)
    : Array.isArray(scopeRaw)
      ? scopeRaw.map(String)
      : [];

  return {
    clientId,
    clientName: String(client?.['name'] ?? client?.['client_name'] ?? clientId),
    scopes,
    createdAt: typeof raw['created_at'] === 'string' ? raw['created_at'] : undefined,
  };
}

export function mapOAuthGrantList(rows: unknown): OAuthGrantSummary[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => mapOAuthGrant(row as Record<string, unknown>))
    .filter((row): row is OAuthGrantSummary => row !== null);
}
