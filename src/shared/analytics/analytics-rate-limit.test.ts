import { describe, expect, it } from 'vitest';

import {
  analyticsIdentity,
  tryConsumeAnalytics,
} from '@/shared/analytics/analytics-rate-limit';

describe('analytics rate limit', () => {
  it('allows up to 60/min per identity, then denies', () => {
    const buckets = new Map();
    for (let i = 0; i < 60; i++) {
      expect(tryConsumeAnalytics(buckets, 'ip:1.2.3.4', i)).toBe(true);
    }
    expect(tryConsumeAnalytics(buckets, 'ip:1.2.3.4', 60_000 - 1)).toBe(false);
    expect(tryConsumeAnalytics(buckets, 'ip:1.2.3.4', 60_000)).toBe(true);
  });

  it('tracks identities independently', () => {
    const buckets = new Map();
    for (let i = 0; i < 60; i++) {
      tryConsumeAnalytics(buckets, 'ip:a', i);
    }
    expect(tryConsumeAnalytics(buckets, 'ip:a', 59_999)).toBe(false);
    expect(tryConsumeAnalytics(buckets, 'ip:b', 59_999)).toBe(true);
  });

  it('derives identity from proxy headers, unknown fallback', () => {
    expect(
      analyticsIdentity(
        new Request('https://x.test/', { headers: { 'cf-connecting-ip': '9.9.9.9' } })
      )
    ).toBe('ip:9.9.9.9');
    expect(
      analyticsIdentity(
        new Request('https://x.test/', {
          headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
        })
      )
    ).toBe('ip:1.1.1.1');
    expect(analyticsIdentity(new Request('https://x.test/'))).toBe('ip:unknown');
  });
});
