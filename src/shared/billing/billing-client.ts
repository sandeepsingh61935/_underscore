/**
 * Platform-agnostic billing HTTP client.
 * Uses Supabase session JWT for edge functions; RLS for entitlement reads.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  freeEntitlement,
  rowToEntitlement,
} from './entitlement';
import type {
  BillingEntitlement,
  BillingEntitlementRow,
  BillingUrlResult,
  CheckoutOptions,
} from './types';

export interface BillingClientConfig {
  supabase: SupabaseClient;
  /** e.g. https://xxxx.supabase.co — defaults from supabase if possible */
  functionsBaseUrl?: string;
  getAccessToken: () => Promise<string | null>;
}

function resolveFunctionsBase(
  supabase: SupabaseClient,
  override?: string
): string {
  if (override) return override.replace(/\/$/, '');
  // supabase-js stores URL on supabaseUrl in some versions; fall back to env
  const fromEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env
          ?.VITE_SUPABASE_URL
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Best-effort: rest URL without /rest/v1
  const anyClient = supabase as unknown as { supabaseUrl?: string };
  if (anyClient.supabaseUrl) return anyClient.supabaseUrl.replace(/\/$/, '');
  throw new Error('Cannot resolve Supabase functions base URL');
}

export async function fetchBillingEntitlement(
  config: BillingClientConfig
): Promise<BillingEntitlement> {
  const { data, error } = await config.supabase
    .from('billing_entitlements')
    .select('*')
    .maybeSingle();

  if (error) {
    // Table missing or RLS — treat as free rather than crash clients
    console.warn('[billing] entitlement read failed:', error.message);
    return freeEntitlement();
  }

  return rowToEntitlement(data as BillingEntitlementRow | null);
}

async function postBillingFunction(
  config: BillingClientConfig,
  path: string,
  body: Record<string, unknown>
): Promise<BillingUrlResult> {
  const token = await config.getAccessToken();
  if (!token) {
    throw new Error('Sign in required for billing');
  }

  const base = resolveFunctionsBase(config.supabase, config.functionsBaseUrl);
  const res = await fetch(`${base}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey:
        (typeof import.meta !== 'undefined' &&
          (import.meta as ImportMeta & { env?: Record<string, string> }).env
            ?.VITE_SUPABASE_ANON_KEY) ||
        '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!res.ok || !json.url) {
    throw new Error(json.error || `Billing request failed (${res.status})`);
  }

  return { url: json.url };
}

export async function createBillingCheckout(
  config: BillingClientConfig,
  options: CheckoutOptions
): Promise<BillingUrlResult> {
  return postBillingFunction(config, 'billing-checkout', {
    successUrl: options.successUrl,
    cancelUrl: options.cancelUrl,
    customerIpAddress: options.customerIpAddress,
  });
}

export async function createBillingPortal(
  config: BillingClientConfig
): Promise<BillingUrlResult> {
  return postBillingFunction(config, 'billing-portal', {});
}

/** Open a billing URL in a new tab (extension or web). */
export function openBillingUrl(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
