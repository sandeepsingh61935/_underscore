import { useCallback, useEffect, useState } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { useMessageBus } from '@/shared/contexts/MessageBusContext';
import {
  mapOAuthGrantList,
  type OAuthGrantSummary,
} from '@/shared/oauth/oauth-grants';
import {
  IPC_OAUTH_LIST_GRANTS,
  IPC_OAUTH_REVOKE_GRANT,
  type MessageResponse,
} from '@/shared/schemas/message-schemas';

export type { OAuthGrantSummary } from '@/shared/oauth/oauth-grants';

export interface UseOAuthGrantsResult {
  grants: OAuthGrantSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  revoke: (clientId: string) => Promise<void>;
  isRevoking: boolean;
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
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
      if (hasChromeRuntime() && messageBus) {
        const res = await messageBus.send<MessageResponse<OAuthGrantSummary[]>>(
          'background',
          { type: IPC_OAUTH_LIST_GRANTS, payload: {}, timestamp: Date.now() },
        );
        if (!res || !res.success) {
          throw new Error(res && !res.success ? res.error : 'Failed to load connected apps');
        }
        setGrants(res.data ?? []);
        return;
      }

      const supabase = getWebSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setGrants([]);
        setError('Sign in to see connected apps');
        return;
      }

      const { data, error: listError } = await supabase.auth.oauth.listGrants();
      if (listError) {
        throw listError;
      }
      setGrants(mapOAuthGrantList(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load connected apps';
      setError(message);
      setGrants([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, messageBus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const revoke = useCallback(async (clientId: string) => {
    setIsRevoking(true);
    setError(null);
    try {
      if (hasChromeRuntime() && messageBus) {
        const res = await messageBus.send<MessageResponse<{ clientId: string }>>(
          'background',
          {
            type: IPC_OAUTH_REVOKE_GRANT,
            payload: { clientId },
            timestamp: Date.now(),
          },
        );
        if (!res || !res.success) {
          throw new Error(res && !res.success ? res.error : 'Failed to revoke access');
        }
        await reload();
        return;
      }

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
  }, [messageBus, reload]);

  return { grants, isLoading, error, reload, revoke, isRevoking };
}
