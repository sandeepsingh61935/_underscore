/**
 * Durable billing rate limit for Edge (WP-5).
 * Uses Postgres `billing_try_rate_limit` so counters survive multi-isolate / cold starts.
 * Pure parse helper mirrors src/shared/billing/rate-limit.ts.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
  /**
   * True when the limiter itself is unavailable (missing env / RPC failure).
   * Callers must fail closed (503) rather than treating this as over-limit.
   */
  unavailable?: boolean;
}

/** Fail closed on malformed RPC (deny rather than allow abuse during outage). */
export function parseBillingRateLimitRpc(data: unknown): RateLimitDecision {
  if (!data || typeof data !== 'object') {
    return { allowed: false, retryAfterMs: 60_000, unavailable: true };
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.allowed !== 'boolean') {
    return { allowed: false, retryAfterMs: 60_000, unavailable: true };
  }
  const retry =
    typeof rec.retryAfterMs === 'number' && Number.isFinite(rec.retryAfterMs)
      ? Math.max(0, Math.floor(rec.retryAfterMs))
      : 0;
  return { allowed: rec.allowed, retryAfterMs: retry };
}

function serviceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Atomic fixed-window consume via DB. Key should be scoped, e.g. `billing-sync:${userId}`.
 */
export async function tryRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  nowMs: number = Date.now()
): Promise<RateLimitDecision> {
  const admin = serviceClient();
  if (!admin) {
    console.error('rate limit: missing SUPABASE_URL / SERVICE_ROLE_KEY — fail closed');
    return { allowed: false, retryAfterMs: 60_000, unavailable: true };
  }

  const { data, error } = await admin.rpc('billing_try_rate_limit', {
    p_key: key,
    p_max: maxAttempts,
    p_window_ms: windowMs,
    p_now_ms: nowMs,
  });

  if (error) {
    console.error('rate limit rpc failed — fail closed', error.message);
    return { allowed: false, retryAfterMs: 60_000, unavailable: true };
  }

  return parseBillingRateLimitRpc(data);
}
