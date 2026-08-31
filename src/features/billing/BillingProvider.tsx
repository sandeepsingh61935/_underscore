/**
 * Owns billing snapshot + mode sync. Mode is projected from auth + paid when load is ready.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useBilling } from '@/features/billing/hooks/useBilling';
import { IpcBillingPort } from '@/features/billing/ports/ipc-billing-port';
import {
  shouldRunFocusBillingSync,
  shouldSyncModeFromBilling,
  setEntitlementPaidActive,
  SupabaseBillingPort,
  type BillingSnapshot,
  type CheckoutOptions,
  type IBillingPort,
} from '@/shared/billing';
import { useMessageBus } from '@/shared/contexts/MessageBusContext';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveBillingModeWrite } from '@/shared/utils/mode-transition';

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
   * Current product mode — used so paid users can prefer Free (pro) without
   * billing forcing them back to pro_xai on every ready snapshot.
   */
  currentMode?: ModeType;
  /**
   * Apply mode only when entitlement clamp requires it (demote unpaid AI,
   * rising-edge paid activation). Never on error/loading.
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
  currentMode = 'pro',
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
  /** null until first ready entitlement sample. */
  const previousIsPaidActiveRef = useRef<boolean | null>(null);
  const isPaidActiveRef = useRef(billing.snapshot.isPaidActive);
  isPaidActiveRef.current = billing.snapshot.isPaidActive;
  const syncFromPolarRef = useRef(billing.syncFromPolar);
  const refreshRef = useRef(billing.refresh);
  syncFromPolarRef.current = billing.syncFromPolar;
  refreshRef.current = billing.refresh;

  // Publish paid gate for setMode (Paid↔Free when entitled).
  useEffect(() => {
    setEntitlementPaidActive(isAuthenticated && billing.snapshot.isPaidActive);
    if (!isAuthenticated) {
      setEntitlementPaidActive(false);
    }
  }, [isAuthenticated, billing.snapshot.isPaidActive]);

  useEffect(() => {
    if (!isAuthenticated) {
      successHandledRef.current = false;
      lastFocusSyncAt.current = 0;
      previousIsPaidActiveRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!onEffectiveMode) return;
    if (!shouldSyncModeFromBilling(billing.snapshot.loadState)) return;

    const isPaidActive = billing.snapshot.isPaidActive;
    const decision = resolveBillingModeWrite({
      isAuthenticated,
      isPaidActive,
      currentMode,
      previousIsPaidActive: previousIsPaidActiveRef.current,
    });
    previousIsPaidActiveRef.current = isPaidActive;

    if (!decision.write) return;

    const key = `${isAuthenticated}:${isPaidActive}:${decision.mode}`;
    if (lastSynced.current === key) return;
    lastSynced.current = key;
    onEffectiveMode(decision.mode);
  }, [
    billing.snapshot.loadState,
    billing.snapshot.isPaidActive,
    isAuthenticated,
    currentMode,
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

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
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
