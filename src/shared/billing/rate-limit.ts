/**
 * Pure fixed-window counter for billing edge rate limits (WP-5).
 * Edge durable path: Postgres `billing_try_rate_limit` (same semantics).
 */

export interface RateBucket {
  windowStart: number;
  count: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export function createEmptyRateBucket(now: number): RateBucket {
  return { windowStart: now, count: 0 };
}

export function tryConsumeRateLimit(
  bucket: RateBucket,
  now: number,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; bucket: RateBucket; retryAfterMs: number } {
  let windowStart = bucket.windowStart;
  let count = bucket.count;

  if (now - windowStart >= windowMs) {
    windowStart = now;
    count = 0;
  }

  if (count >= maxAttempts) {
    const retryAfterMs = Math.max(0, windowMs - (now - windowStart));
    return {
      allowed: false,
      bucket: { windowStart, count },
      retryAfterMs,
    };
  }

  return {
    allowed: true,
    bucket: { windowStart, count: count + 1 },
    retryAfterMs: 0,
  };
}

/**
 * Parse durable RPC JSON from `billing_try_rate_limit`.
 * Malformed / missing → fail open (do not lock users out if DB hiccups).
 */
export function parseBillingRateLimitRpc(data: unknown): RateLimitDecision {
  if (!data || typeof data !== 'object') {
    return { allowed: true, retryAfterMs: 0 };
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec['allowed'] !== 'boolean') {
    return { allowed: true, retryAfterMs: 0 };
  }
  const rawRetry = rec['retryAfterMs'];
  const retry =
    typeof rawRetry === 'number' && Number.isFinite(rawRetry)
      ? Math.max(0, Math.floor(rawRetry))
      : 0;
  return { allowed: rec['allowed'] as boolean, retryAfterMs: retry };
}
