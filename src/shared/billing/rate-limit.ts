/**
 * Pure sliding-window counter for billing edge rate limits (WP-5).
 */

export interface RateBucket {
  windowStart: number;
  count: number;
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
