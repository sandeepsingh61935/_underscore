import type { SupabaseClient } from '@supabase/supabase-js';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { mapOAuthGrantList, type OAuthGrantSummary } from '@/shared/oauth/oauth-grants';
import {
  IPC_OAUTH_LIST_GRANTS,
  IPC_OAUTH_REVOKE_GRANT,
} from '@/shared/schemas/message-schemas';

export interface OAuthGrantHandlerDeps {
  messageBus: IMessageBus;
  authManager: IAuthManager;
  getSupabase: () => SupabaseClient;
  logger: ILogger;
}

export function registerOAuthGrantHandlers(deps: OAuthGrantHandlerDeps): void {
  const { messageBus, authManager, getSupabase, logger } = deps;

  messageBus.subscribe(IPC_OAUTH_LIST_GRANTS, async () => {
    try {
      if (!authManager.isAuthenticated) {
        return { success: true, data: [] as OAuthGrantSummary[] };
      }
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) {
        throw error;
      }
      return { success: true, data: mapOAuthGrantList(data) };
    } catch (error) {
      logger.error('IPC_OAUTH_LIST_GRANTS failed', error as Error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to load connected apps',
        code: 'OAUTH_GRANTS_ERROR',
      };
    }
  });

  messageBus.subscribe(IPC_OAUTH_REVOKE_GRANT, async (payload: { clientId?: string }) => {
    try {
      const clientId = payload?.clientId?.trim();
      if (!clientId) {
        return { success: false, error: 'clientId is required', code: 'INVALID_ARGUMENT' };
      }
      if (!authManager.isAuthenticated) {
        return { success: false, error: 'Sign in required', code: 'AUTH_REQUIRED' };
      }
      const supabase = getSupabase();
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (error) {
        throw error;
      }
      return { success: true, data: { clientId } };
    } catch (error) {
      logger.error('IPC_OAUTH_REVOKE_GRANT failed', error as Error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to revoke access',
        code: 'OAUTH_REVOKE_ERROR',
      };
    }
  });
}
