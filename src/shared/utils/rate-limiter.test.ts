import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter (persistent)', () => {
  beforeEach(() => {
    (globalThis as any).chrome = {
      storage: {
        local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } as any,
      },
    };
  });

  it('persists attempt count to chrome.storage.local on tryAcquire', async () => {
    const set = vi.fn(async () => {});
    (globalThis as any).chrome.storage.local.set = set;
    const limiter = await RateLimiter.persistent(
      { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
      {
        logger: {
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          error: vi.fn(),
          setLevel: vi.fn(),
          getLevel: vi.fn(),
        } as any,
      }
    );
    await limiter.tryAcquire();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        'rl:test': expect.objectContaining({
          attempts: 1,
          windowStart: expect.any(Number),
        }),
      })
    );
  });

  it('survives an SW restart by reading the persisted state on construction', async () => {
    const get = vi.fn(async () => ({
      'rl:test': { attempts: 2, windowStart: Date.now() },
    }));
    (globalThis as any).chrome.storage.local.get = get;
    const limiter = await RateLimiter.persistent(
      { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
      {
        logger: {
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          error: vi.fn(),
          setLevel: vi.fn(),
          getLevel: vi.fn(),
        } as any,
      }
    );
    expect(await limiter.tryAcquire()).toBe(true); // attempts -> 3
    expect(await limiter.tryAcquire()).toBe(false); // already at max
  });

  it('fails closed (returns false) when chrome.storage.local is unavailable', async () => {
    delete (globalThis as any).chrome;
    const limiter = await RateLimiter.persistent(
      { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
      {
        logger: {
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          error: vi.fn(),
          setLevel: vi.fn(),
          getLevel: vi.fn(),
        } as any,
      }
    );
    expect(await limiter.tryAcquire()).toBe(false);
  });

  it('resets the window when windowStart is older than windowMs', async () => {
    const get = vi.fn(async () => ({
      'rl:test': { attempts: 99, windowStart: Date.now() - 120_000 },
    }));
    (globalThis as any).chrome.storage.local.get = get;
    const limiter = await RateLimiter.persistent(
      { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
      {
        logger: {
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          error: vi.fn(),
          setLevel: vi.fn(),
          getLevel: vi.fn(),
        } as any,
      }
    );
    expect(await limiter.tryAcquire()).toBe(true); // window reset
  });

  it('preserves the existing constructor for backward compatibility', () => {
    const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    expect(limiter.tryAcquire()).toBe(true);
  });

  describe('getRetryAfterMs', () => {
    it('returns 0 when attempts remain', () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 60_000 });
      limiter.tryAcquire();
      expect(limiter.getRetryAfterMs()).toBe(0);
    });

    it('returns the remaining window time once exhausted', () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 60_000 });
      limiter.tryAcquire();
      expect(limiter.tryAcquire()).toBe(false);
      const retryAfterMs = limiter.getRetryAfterMs();
      expect(retryAfterMs).toBeGreaterThan(0);
      expect(retryAfterMs).toBeLessThanOrEqual(60_000);
    });

    it('returns 0 once the window has elapsed', () => {
      vi.useFakeTimers();
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1_000 });
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.getRetryAfterMs()).toBeGreaterThan(0);

      vi.advanceTimersByTime(1_001);
      expect(limiter.getRetryAfterMs()).toBe(0);
      vi.useRealTimers();
    });
  });
});
