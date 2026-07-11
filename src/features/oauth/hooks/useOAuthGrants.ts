import { useCallback, useEffect, useState } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export interface OAuthGrantSummary {
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt?: string;
}

function mapGrant(raw: Record<string, unknown>): OAuthGrantSummary | null {
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

export interface UseOAuthGrantsResult {
  grants: OAuthGrantSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  revoke: (clientId: string) => Promise<void>;
  isRevoking: boolean;
}

export function useOAuthGrants(enabled: boolean): UseOAuthGrantsResult {
  const [grants, setGrants] = useState<OAuthGrantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setGrants([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getWebSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setGrants([]);
        return;
      }

      const { data, error: listError } = await supabase.auth.oauth.listGrants();
      if (listError) {
        throw listError;
      }

      const rows = Array.isArray(data) ? data : [];
      setGrants(
        rows
          .map((row) => mapGrant(row as Record<string, unknown>))
          .filter((row): row is OAuthGrantSummary => row !== null),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load connected apps';
      setError(message);
      setGrants([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const revoke = useCallback(async (clientId: string) => {
    setIsRevoking(true);
    setError(null);
    try {
      const supabase = getWebSupabaseClient();
      const { error: revokeError } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (revokeError) {
        throw revokeError;
      }
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke access';
      setError(message);
    } finally {
      setIsRevoking(false);
    }
  }, [reload]);

  return { grants, isLoading, error, reload, revoke, isRevoking };
}
