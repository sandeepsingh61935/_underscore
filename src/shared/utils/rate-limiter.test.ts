import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter (persistent)', () => {
    beforeEach(() => {
        // @ts-expect-error - test-only mock
        globalThis.chrome = {
            storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } },
        };
    });

    it('persists attempt count to chrome.storage.local on tryAcquire', async () => {
        const set = vi.fn(async () => {});
        // @ts-expect-error - test-only mock
        globalThis.chrome.storage.local.set = set;
        const limiter = await RateLimiter.persistent(
            { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
            { logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn(), setLevel: vi.fn(), getLevel: vi.fn() } as any }
        );
        await limiter.tryAcquire();
        expect(set).toHaveBeenCalledWith(
            expect.objectContaining({ 'rl:test': expect.objectContaining({ attempts: 1, windowStart: expect.any(Number) }) })
        );
    });

    it('survives an SW restart by reading the persisted state on construction', async () => {
        const get = vi.fn(async () => ({
            'rl:test': { attempts: 2, windowStart: Date.now() },
        }));
        // @ts-expect-error
        globalThis.chrome.storage.local.get = get;
        const limiter = await RateLimiter.persistent(
            { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
            { logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn(), setLevel: vi.fn(), getLevel: vi.fn() } as any }
        );
        expect(await limiter.tryAcquire()).toBe(true);  // attempts -> 3
        expect(await limiter.tryAcquire()).toBe(false); // already at max
    });

    it('fails closed (returns false) when chrome.storage.local is unavailable', async () => {
        // @ts-expect-error
        delete (globalThis as any).chrome;
        const limiter = await RateLimiter.persistent(
            { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
            { logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn(), setLevel: vi.fn(), getLevel: vi.fn() } as any }
        );
        expect(await limiter.tryAcquire()).toBe(false);
    });

    it('resets the window when windowStart is older than windowMs', async () => {
        const get = vi.fn(async () => ({
            'rl:test': { attempts: 99, windowStart: Date.now() - 120_000 },
        }));
        // @ts-expect-error
        globalThis.chrome.storage.local.get = get;
        const limiter = await RateLimiter.persistent(
            { maxAttempts: 3, windowMs: 60_000, storageKey: 'rl:test' },
            { logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn(), setLevel: vi.fn(), getLevel: vi.fn() } as any }
        );
        expect(await limiter.tryAcquire()).toBe(true); // window reset
    });

    it('preserves the existing constructor for backward compatibility', () => {
        const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 60_000 });
        expect(limiter.tryAcquire()).toBe(true);
    });
});
