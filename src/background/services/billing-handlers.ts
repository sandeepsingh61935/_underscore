/**
 * Polar billing IPC handlers — keeps background.ts free of billing spaghetti.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import {
  freeEntitlement,
  getBillingAppOrigin,
  openBillingUrl,
  SupabaseBillingPort,
} from '@/shared/billing';
import {
  IPC_BILLING_GET_ENTITLEMENT,
  IPC_BILLING_OPEN_PORTAL,
  IPC_BILLING_START_CHECKOUT,
  IPC_BILLING_SYNC_FROM_POLAR,
} from '@/shared/schemas/message-schemas';

export interface BillingHandlerDeps {
  messageBus: IMessageBus;
  authManager: IAuthManager;
  getSupabase: () => SupabaseClient;
  logger: ILogger;
}

export function registerBillingHandlers(deps: BillingHandlerDeps): void {
  const { messageBus, authManager, getSupabase, logger } = deps;

  const port = () => {
    const supabase = getSupabase();
    return new SupabaseBillingPort({
      supabase,
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
    });
  };

  messageBus.subscribe(IPC_BILLING_GET_ENTITLEMENT, async () => {
    try {
      if (!authManager.isAuthenticated) {
        return { success: true, data: freeEntitlement() };
      }
      const entitlement = await port().getEntitlement();
      return { success: true, data: entitlement };
    } catch (error) {
      logger.error('IPC_BILLING_GET_ENTITLEMENT failed', error as Error);
      // Surface error — clients must not treat as free demotion
      return {
        success: false,
        error: (error as Error).message || 'Failed to load entitlement',
        code: 'BILLING_ENTITLEMENT_ERROR',
      };
    }
  });

  messageBus.subscribe(
    IPC_BILLING_START_CHECKOUT,
    async (payload: { successUrl?: string; cancelUrl?: string }) => {
      try {
        if (!authManager.isAuthenticated) {
          return { success: false, error: 'Sign in required', code: 'AUTH_REQUIRED' };
        }
        const origin = getBillingAppOrigin();
        const successUrl =
          payload?.successUrl ??
          `${origin}/settings?billing=success&client=extension`;
        const cancelUrl =
          payload?.cancelUrl ??
          `${origin}/settings?billing=cancel&client=extension`;
        const { url } = await port().createCheckout({ successUrl, cancelUrl });
        openBillingUrl(url);
        return { success: true, data: { url } };
      } catch (error) {
        logger.error('IPC_BILLING_START_CHECKOUT failed', error as Error);
        return {
          success: false,
          error: (error as Error).message || 'Checkout failed',
          code: 'BILLING_CHECKOUT_ERROR',
        };
      }
    }
  );

  messageBus.subscribe(IPC_BILLING_OPEN_PORTAL, async () => {
    try {
      if (!authManager.isAuthenticated) {
        return { success: false, error: 'Sign in required', code: 'AUTH_REQUIRED' };
      }
      const { url } = await port().createPortal();
      openBillingUrl(url);
      return { success: true, data: { url } };
    } catch (error) {
      logger.error('IPC_BILLING_OPEN_PORTAL failed', error as Error);
      return {
        success: false,
        error: (error as Error).message || 'Portal failed',
        code: 'BILLING_PORTAL_ERROR',
      };
    }
  });

  messageBus.subscribe(IPC_BILLING_SYNC_FROM_POLAR, async () => {
    try {
      if (!authManager.isAuthenticated) {
        return { success: false, error: 'Sign in required', code: 'AUTH_REQUIRED' };
      }
      const p = port();
      if (!p.syncFromPolar) {
        return {
          success: false,
          error: 'Sync not available',
          code: 'BILLING_SYNC_UNAVAILABLE',
        };
      }
      const result = await p.syncFromPolar();
      return { success: true, data: result };
    } catch (error) {
      logger.error('IPC_BILLING_SYNC_FROM_POLAR failed', error as Error);
      return {
        success: false,
        error: (error as Error).message || 'Billing sync failed',
        code: 'BILLING_SYNC_ERROR',
      };
    }
  });

  logger.info('Billing IPC handlers registered');
}
