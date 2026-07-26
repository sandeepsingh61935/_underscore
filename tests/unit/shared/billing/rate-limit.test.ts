import { describe, expect, it } from 'vitest';
import {
  createEmptyRateBucket,
  tryConsumeRateLimit,
} from '@/shared/billing/rate-limit';

describe('billing rate limit (WP-5)', () => {
  const windowMs = 15 * 60 * 1000;
  const max = 5;

  it('allows up to max attempts in a window', () => {
    let bucket = createEmptyRateBucket(0);
    for (let i = 0; i < max; i++) {
      const r = tryConsumeRateLimit(bucket, i * 1000, max, windowMs);
      expect(r.allowed).toBe(true);
      bucket = r.bucket;
    }
    const blocked = tryConsumeRateLimit(bucket, max * 1000, max, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after window elapses', () => {
    let bucket = createEmptyRateBucket(0);
    for (let i = 0; i < max; i++) {
      bucket = tryConsumeRateLimit(bucket, 0, max, windowMs).bucket;
    }
    const after = tryConsumeRateLimit(bucket, windowMs + 1, max, windowMs);
    expect(after.allowed).toBe(true);
  });

  it('uses independent keys via separate buckets', () => {
    const a = tryConsumeRateLimit(createEmptyRateBucket(0), 0, 1, windowMs);
    const b = tryConsumeRateLimit(createEmptyRateBucket(0), 0, 1, windowMs);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
