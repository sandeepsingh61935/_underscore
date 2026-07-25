/**
 * Web (and any direct Supabase) billing port implementation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from './config';
import { freeEntitlement, rowToEntitlement } from './entitlement';
import type {
  BillingEntitlement,
  BillingEntitlementRow,
  BillingUrlResult,
  CheckoutOptions,
  IBillingPort,
} from './types';

export interface SupabaseBillingPortOptions {
  supabase: SupabaseClient;
  getAccessToken: () => Promise<string | null>;
  functionsBaseUrl?: string;
}

export class SupabaseBillingPort implements IBillingPort {
  constructor(private readonly opts: SupabaseBillingPortOptions) {}

  async getEntitlement(): Promise<BillingEntitlement> {
    const { data, error } = await this.opts.supabase
      .from('billing_entitlements')
      .select(
        'user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end, cancel_at_period_end, raw_status, updated_at, created_at'
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load billing entitlement');
    }

    return rowToEntitlement(data as BillingEntitlementRow | null);
  }

  async createCheckout(options: CheckoutOptions): Promise<BillingUrlResult> {
    return this.postFunction('billing-checkout', {
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      customerIpAddress: options.customerIpAddress,
    });
  }

  async createPortal(): Promise<BillingUrlResult> {
    return this.postFunction('billing-portal', {});
  }

  private async postFunction(
    path: string,
    body: Record<string, unknown>
  ): Promise<BillingUrlResult> {
    const token = await this.opts.getAccessToken();
    if (!token) {
      throw new Error('Sign in required for billing');
    }

    const base = (
      this.opts.functionsBaseUrl ?? getSupabaseUrl()
    ).replace(/\/$/, '');

    const res = await fetch(`${base}/functions/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
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
}

/** @deprecated use freeEntitlement + throw path; kept for rare offline probes */
export async function fetchBillingEntitlementSafe(
  port: IBillingPort
): Promise<BillingEntitlement> {
  try {
    return await port.getEntitlement();
  } catch {
    return freeEntitlement();
  }
}

export function openBillingUrl(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
