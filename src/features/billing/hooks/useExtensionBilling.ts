/**
 * Extension popup billing via background IPC (session lives in SW).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  freeEntitlement,
  type BillingEntitlement,
} from '@/shared/billing';
import {
  IPC_BILLING_GET_ENTITLEMENT,
  IPC_BILLING_OPEN_PORTAL,
  IPC_BILLING_START_CHECKOUT,
} from '@/shared/schemas/message-schemas';

function sendIpc<T>(
  type: string,
  payload: unknown = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({ success: false, error: 'Extension runtime unavailable' });
      return;
    }
    chrome.runtime.sendMessage(
      { type, payload, timestamp: Date.now() },
      (response: { success?: boolean; data?: T; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        resolve({
          success: Boolean(response?.success),
          data: response?.data,
          error: response?.error,
        });
      }
    );
  });
}

export function useExtensionBilling(isAuthenticated: boolean) {
  const [entitlement, setEntitlement] =
    useState<BillingEntitlement>(freeEntitlement);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setEntitlement(freeEntitlement());
      setReady(true);
      return;
    }
    const res = await sendIpc<BillingEntitlement>(IPC_BILLING_GET_ENTITLEMENT);
    if (res.success && res.data) {
      setEntitlement(res.data);
      setError(null);
    } else {
      setEntitlement(freeEntitlement());
      if (res.error) setError(res.error);
    }
    setReady(true);
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Refresh when popup gains focus (return from Polar checkout tab)
  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const startCheckout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await sendIpc<{ url: string }>(IPC_BILLING_START_CHECKOUT, {});
      if (!res.success) {
        throw new Error(res.error || 'Checkout failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await sendIpc<{ url: string }>(IPC_BILLING_OPEN_PORTAL, {});
      if (!res.success) {
        throw new Error(res.error || 'Portal failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portal failed');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

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
