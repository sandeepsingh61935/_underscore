/**
 * Loads billing entitlement for the signed-in user and exposes upgrade/portal actions.
 * Platform-agnostic: works with a Supabase client + access token getter.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createBillingCheckout,
  createBillingPortal,
  fetchBillingEntitlement,
  freeEntitlement,
  openBillingUrl,
  type BillingEntitlement,
  type CheckoutOptions,
} from '@/shared/billing';

export interface UseBillingEntitlementOptions {
  supabase: SupabaseClient | null;
  getAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
  /** Default success URL for checkout (web origin or hosted billing done page) */
  defaultSuccessUrl?: string;
  defaultCancelUrl?: string;
  enabled?: boolean;
}

export interface UseBillingEntitlementResult {
  entitlement: BillingEntitlement;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startCheckout: (opts?: Partial<CheckoutOptions>) => Promise<void>;
  openPortal: () => Promise<void>;
  busy: boolean;
}

function defaultAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://underscore-web.pages.dev';
}

export function useBillingEntitlement(
  options: UseBillingEntitlementOptions
): UseBillingEntitlementResult {
  const {
    supabase,
    getAccessToken,
    isAuthenticated,
    defaultSuccessUrl,
    defaultCancelUrl,
    enabled = true,
  } = options;

  const [entitlement, setEntitlement] =
    useState<BillingEntitlement>(freeEntitlement);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || !supabase) {
      setEntitlement(freeEntitlement());
      setReady(true);
      return;
    }
    try {
      const ent = await fetchBillingEntitlement({
        supabase,
        getAccessToken,
      });
      setEntitlement(ent);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing');
      setEntitlement(freeEntitlement());
    } finally {
      setReady(true);
    }
  }, [enabled, isAuthenticated, supabase, getAccessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(
    async (opts?: Partial<CheckoutOptions>) => {
      if (!supabase) throw new Error('Billing not configured');
      setBusy(true);
      setError(null);
      try {
        const successUrl =
          opts?.successUrl ??
          defaultSuccessUrl ??
          `${defaultAppOrigin()}/settings?billing=success`;
        const cancelUrl =
          opts?.cancelUrl ??
          defaultCancelUrl ??
          `${defaultAppOrigin()}/settings?billing=cancel`;
        const { url } = await createBillingCheckout(
          { supabase, getAccessToken },
          {
            successUrl,
            cancelUrl,
            customerIpAddress: opts?.customerIpAddress,
          }
        );
        openBillingUrl(url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Checkout failed';
        setError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [supabase, getAccessToken, defaultSuccessUrl, defaultCancelUrl]
  );

  const openPortal = useCallback(async () => {
    if (!supabase) throw new Error('Billing not configured');
    setBusy(true);
    setError(null);
    try {
      const { url } = await createBillingPortal({
        supabase,
        getAccessToken,
      });
      openBillingUrl(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Portal failed';
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [supabase, getAccessToken]);

  return {
    entitlement,
    ready,
    error,
    refresh,
    startCheckout,
    openPortal,
    busy,
  };
}
