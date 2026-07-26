/**
 * Owns billing snapshot + mode sync. Mode is projected from auth + paid when load is ready.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import {
  shouldRunFocusBillingSync,
  shouldSyncModeFromBilling,
  SupabaseBillingPort,
  computeEffectiveMode,
  type BillingSnapshot,
  type CheckoutOptions,
  type IBillingPort,
} from '@/shared/billing';
import { useMessageBus } from '@/shared/contexts/MessageBusContext';
import { IpcBillingPort } from '@/features/billing/ports/ipc-billing-port';
import { useBilling } from '@/features/billing/hooks/useBilling';

export interface BillingContextValue {
  snapshot: BillingSnapshot;
  busy: boolean;
  refresh: () => Promise<void>;
  /** Returns true when paid is active after sync (for poll early-exit). */
  syncFromPolar: () => Promise<boolean>;
  startCheckout: (opts?: Partial<CheckoutOptions>) => Promise<void>;
  openPortal: () => Promise<void>;
}

const BillingContext = createContext<BillingContextValue | null>(null);

export interface BillingProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  /**
   * Apply effective mode when billing is ready.
   * Only called for ready snapshots (never on error/loading).
   */
  onEffectiveMode?: (mode: ModeType) => void;
  /** Web: Supabase client + token getter. Extension: omit (uses MessageBus IPC). */
  web?: {
    supabase: SupabaseClient;
    getAccessToken: () => Promise<string | null>;
  };
}

export function BillingProvider({
  children,
  isAuthenticated,
  onEffectiveMode,
  web,
}: BillingProviderProps): React.ReactElement {
  const messageBus = useMessageBus();

  const port: IBillingPort | null = useMemo(() => {
    if (web?.supabase) {
      return new SupabaseBillingPort({
        supabase: web.supabase,
        getAccessToken: web.getAccessToken,
      });
    }
    if (messageBus) {
      return new IpcBillingPort(messageBus);
    }
    return null;
  }, [web, messageBus]);

  const billing = useBilling({ port, isAuthenticated });
  const lastSynced = useRef<string>('');
  const lastFocusSyncAt = useRef(0);
  const successHandledRef = useRef(false);
  const isPaidActiveRef = useRef(billing.snapshot.isPaidActive);
  isPaidActiveRef.current = billing.snapshot.isPaidActive;
  const syncFromPolarRef = useRef(billing.syncFromPolar);
  const refreshRef = useRef(billing.refresh);
  syncFromPolarRef.current = billing.syncFromPolar;
  refreshRef.current = billing.refresh;

  useEffect(() => {
    if (!isAuthenticated) {
      successHandledRef.current = false;
      lastFocusSyncAt.current = 0;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!onEffectiveMode) return;
    if (!shouldSyncModeFromBilling(billing.snapshot.loadState)) return;

    const mode = computeEffectiveMode(
      isAuthenticated,
      billing.snapshot.isPaidActive
    );
    const key = `${isAuthenticated}:${billing.snapshot.isPaidActive}:${mode}`;
    if (lastSynced.current === key) return;
    lastSynced.current = key;
    onEffectiveMode(mode);
  }, [
    billing.snapshot.loadState,
    billing.snapshot.isPaidActive,
    isAuthenticated,
    onEffectiveMode,
  ]);

  // After Polar tab, pull subscription (debounced; skip when already paid)
  useEffect(() => {
    const onFocus = () => {
      if (!isAuthenticated) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (isPaidActiveRef.current) {
        void refreshRef.current();
        return;
      }
      const now = Date.now();
      if (!shouldRunFocusBillingSync(lastFocusSyncAt.current, now)) {
        return;
      }
      lastFocusSyncAt.current = now;
      void syncFromPolarRef.current().catch(() => {
        void refreshRef.current();
      });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated]);

  /**
   * After Polar checkout, user lands on /settings?billing=success.
   * Webhook may lag — poll Polar sync then strip query params.
   * Guarded once per page load; stops early when paid becomes active.
   */
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const billingFlag = params.get('billing');
    if (billingFlag !== 'success' && billingFlag !== 'cancel') return;
    if (successHandledRef.current) return;
    successHandledRef.current = true;

    let cancelled = false;
    const delaysMs = [0, 800, 2000, 4000, 7000];

    void (async () => {
      for (const delay of delaysMs) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
        if (cancelled) return;
        if (billingFlag === 'success') {
          if (isPaidActiveRef.current) break;
          try {
            const paid = await syncFromPolarRef.current();
            if (paid || isPaidActiveRef.current) break;
          } catch {
            await refreshRef.current();
          }
        } else {
          await refreshRef.current();
        }
      }
      if (!cancelled && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('billing');
        url.searchParams.delete('customer_session_token');
        url.searchParams.delete('checkout_id');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Run once when authenticated + success query present; callbacks via stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot per auth
  }, [isAuthenticated]);

  const value = useMemo<BillingContextValue>(
    () => ({
      snapshot: billing.snapshot,
      busy: billing.busy,
      refresh: billing.refresh,
      syncFromPolar: billing.syncFromPolar,
      startCheckout: billing.startCheckout,
      openPortal: billing.openPortal,
    }),
    [
      billing.snapshot,
      billing.busy,
      billing.refresh,
      billing.syncFromPolar,
      billing.startCheckout,
      billing.openPortal,
    ]
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBillingContext(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error('useBillingContext must be used within BillingProvider');
  }
  return ctx;
}

/** Safe for settings tests that mock provider — returns null outside tree. */
export function useBillingContextOptional(): BillingContextValue | null {
  return useContext(BillingContext);
}

/** Convenience: stable no-op onEffectiveMode */
export function useModeSyncCallback(
  persistMode: (mode: ModeType) => void | Promise<void>
): (mode: ModeType) => void {
  return useCallback(
    (mode: ModeType) => {
      void persistMode(mode);
    },
    [persistMode]
  );
}
