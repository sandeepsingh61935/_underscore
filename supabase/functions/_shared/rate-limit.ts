/**
 * In-memory rate limit for Edge isolates (WP-5).
 * Best-effort across cold starts; pure algorithm mirrors src/shared/billing/rate-limit.ts.
 */

interface RateBucket {
  windowStart: number;
  count: number;
}

const store = new Map<string, RateBucket>();

export function tryRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let bucket = store.get(key) ?? { windowStart: now, count: 0 };

  if (now - bucket.windowStart >= windowMs) {
    bucket = { windowStart: now, count: 0 };
  }

  if (bucket.count >= maxAttempts) {
    const retryAfterMs = Math.max(0, windowMs - (now - bucket.windowStart));
    store.set(key, bucket);
    return { allowed: false, retryAfterMs };
  }

  bucket = { windowStart: bucket.windowStart, count: bucket.count + 1 };
  store.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}
