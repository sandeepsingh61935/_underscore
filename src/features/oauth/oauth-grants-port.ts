import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { mapOAuthGrantList, type OAuthGrantSummary } from '@/shared/oauth/oauth-grants';
import {
  IPC_OAUTH_LIST_GRANTS,
  IPC_OAUTH_REVOKE_GRANT,
  type MessageResponse,
} from '@/shared/schemas/message-schemas';

export interface OAuthGrantsPort {
  list(): Promise<OAuthGrantSummary[]>;
  revoke(clientId: string): Promise<void>;
}

export function createIpcOAuthGrantsPort(bus: IMessageBus): OAuthGrantsPort {
  return {
    async list() {
      const res = await bus.send<MessageResponse<OAuthGrantSummary[]>>('background', {
        type: IPC_OAUTH_LIST_GRANTS,
        payload: {},
        timestamp: Date.now(),
      });
      if (!res || !res.success) {
        throw new Error(
          res && !res.success ? res.error : 'Failed to load connected apps'
        );
      }
      return res.data ?? [];
    },
    async revoke(clientId: string) {
      const res = await bus.send<MessageResponse<{ clientId: string }>>('background', {
        type: IPC_OAUTH_REVOKE_GRANT,
        payload: { clientId },
        timestamp: Date.now(),
      });
      if (!res || !res.success) {
        throw new Error(res && !res.success ? res.error : 'Failed to revoke access');
      }
    },
  };
}

export function createWebOAuthGrantsPort(): OAuthGrantsPort {
  return {
    async list() {
      const supabase = getWebSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Sign in to see connected apps');
      }
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) throw error;
      return mapOAuthGrantList(data);
    },
    async revoke(clientId: string) {
      const supabase = getWebSupabaseClient();
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (error) throw error;
    },
  };
}

function hasChromeRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function'
  );
}

export function resolveOAuthGrantsPort(bus: IMessageBus | null): OAuthGrantsPort {
  if (hasChromeRuntime() && bus) {
    return createIpcOAuthGrantsPort(bus);
  }
  return createWebOAuthGrantsPort();
}
