/**
 * Single billing hook over IBillingPort (web Supabase or extension IPC).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  emptyBillingSnapshot,
  getBillingAppOrigin,
  isBillingDevOverrideEnabled,
  openBillingUrl,
  snapshotFromEntitlement,
  type BillingSnapshot,
  type CheckoutOptions,
  type IBillingPort,
} from '@/shared/billing';

export interface UseBillingOptions {
  port: IBillingPort | null;
  isAuthenticated: boolean;
  /** When true, isPaidActive includes VITE_BILLING_DEV_OVERRIDE */
  applyDevOverride?: boolean;
  defaultSuccessUrl?: string;
  defaultCancelUrl?: string;
}

export interface UseBillingResult {
  snapshot: BillingSnapshot;
  busy: boolean;
  refresh: () => Promise<void>;
  /** Pull Polar customer state into DB then refresh (post-checkout). */
  syncFromPolar: () => Promise<void>;
  startCheckout: (opts?: Partial<CheckoutOptions>) => Promise<void>;
  openPortal: () => Promise<void>;
}

export function useBilling(options: UseBillingOptions): UseBillingResult {
  const {
    port,
    isAuthenticated,
    applyDevOverride = true,
    defaultSuccessUrl,
    defaultCancelUrl,
  } = options;

  const [snapshot, setSnapshot] = useState<BillingSnapshot>(() =>
    emptyBillingSnapshot('idle')
  );
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !port) {
      setSnapshot(emptyBillingSnapshot('ready'));
      return;
    }

    setSnapshot((prev) => ({
      ...prev,
      loadState: prev.loadState === 'ready' ? 'ready' : 'loading',
      error: null,
    }));

    try {
      const entitlement = await port.getEntitlement();
      const forcePaid =
        applyDevOverride && isBillingDevOverrideEnabled() ? true : undefined;
      setSnapshot(
        snapshotFromEntitlement(entitlement, {
          loadState: 'ready',
          forcePaid,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load billing';
      // Keep prior entitlement on error — never demote paid on load failure
      setSnapshot((prev) => ({
        loadState: 'error',
        entitlement: prev.entitlement,
        error: message,
        // Preserve previous isPaidActive if we already knew it; else false
        isPaidActive:
          prev.loadState === 'ready'
            ? prev.isPaidActive
            : applyDevOverride && isBillingDevOverrideEnabled(),
      }));
    }
  }, [isAuthenticated, port, applyDevOverride]);

  /** After checkout: pull Polar → DB, then re-read entitlement. Throws on hard failure. */
  const syncFromPolar = useCallback(async () => {
    if (!isAuthenticated || !port) {
      await refresh();
      return;
    }
    setBusy(true);
    try {
      if (port.syncFromPolar) {
        await port.syncFromPolar();
      }
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Billing sync failed';
      setSnapshot((prev) => ({ ...prev, error: message }));
      throw e;
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, port, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(
    async (opts?: Partial<CheckoutOptions>) => {
      if (!port) throw new Error('Billing not configured');
      setBusy(true);
      try {
        const origin = getBillingAppOrigin();
        const successUrl =
          opts?.successUrl ??
          defaultSuccessUrl ??
          `${origin}/settings?billing=success`;
        const cancelUrl =
          opts?.cancelUrl ??
          defaultCancelUrl ??
          `${origin}/settings?billing=cancel`;
        const { url } = await port.createCheckout({
          successUrl,
          cancelUrl,
          customerIpAddress: opts?.customerIpAddress,
        });
        openBillingUrl(url);
      } finally {
        setBusy(false);
      }
    },
    [port, defaultSuccessUrl, defaultCancelUrl]
  );

  const openPortal = useCallback(async () => {
    if (!port) throw new Error('Billing not configured');
    setBusy(true);
    try {
      const { url } = await port.createPortal();
      openBillingUrl(url);
    } finally {
      setBusy(false);
    }
  }, [port]);

  // Guest: ready free without network
  useEffect(() => {
    if (!isAuthenticated) {
      setSnapshot(emptyBillingSnapshot('ready'));
    }
  }, [isAuthenticated]);

  const devPaid = applyDevOverride && isBillingDevOverrideEnabled();
  const effectiveSnapshot: BillingSnapshot =
    devPaid && (snapshot.loadState === 'ready' || snapshot.loadState === 'error')
      ? { ...snapshot, isPaidActive: true }
      : snapshot;

  return {
    snapshot: effectiveSnapshot,
    busy,
    refresh,
    syncFromPolar,
    startCheckout,
    openPortal,
  };
}
