import { useCallback, useEffect, useState } from 'react';

import { resolveOAuthGrantsPort } from '@/features/oauth/oauth-grants-port';
import { useMessageBus } from '@/shared/contexts/MessageBusContext';
import type { OAuthGrantSummary } from '@/shared/oauth/oauth-grants';

export type { OAuthGrantSummary } from '@/shared/oauth/oauth-grants';

export interface UseOAuthGrantsResult {
  grants: OAuthGrantSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  revoke: (clientId: string) => Promise<void>;
  isRevoking: boolean;
}

export function useOAuthGrants(enabled: boolean): UseOAuthGrantsResult {
  const messageBus = useMessageBus();
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
      const port = resolveOAuthGrantsPort(messageBus);
      setGrants(await port.list());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load connected apps';
      setError(message);
      setGrants([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, messageBus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const revoke = useCallback(
    async (clientId: string) => {
      setIsRevoking(true);
      setError(null);
      try {
        const port = resolveOAuthGrantsPort(messageBus);
        await port.revoke(clientId);
        await reload();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to revoke access';
        setError(message);
      } finally {
        setIsRevoking(false);
      }
    },
    [messageBus, reload]
  );

  return { grants, isLoading, error, reload, revoke, isRevoking };
}
