/**
 * @file rate-limiter-persistent.test.ts
 * @description Tests for the persistent variant of RateLimiter (sync side).
 * Mirrors the auth-side `RateLimiter.persistent` pattern from ADR-019 but
 * does not share the class — sync is a token bucket, auth is a fixed
 * window. Different shape, same persistence strategy.
 *
 * Threat model: an attacker triggers an SW unload mid-flood to reset
 * sync throttling. Persistence denies that bypass.
 *
 * @see docs/04-adrs/019-rate-limiting-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '@/background/sync/rate-limiter';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

const installChromeStorageMock = (initial: Record<string, unknown> = {}): {
    store: Record<string, unknown>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
} => {
    const store: Record<string, unknown> = { ...initial };
    const get = vi.fn(async (key: string) => ({ [key]: store[key] }));
    const set = vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(store, items);
    });
    (globalThis as any).chrome = {
        storage: { local: { get, set } },
    };
    return { store, get, set };
};

describe('RateLimiter (sync) — persistent variant', () => {
    let logger: ILogger;
    let eventBus: EventBus;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
    });

    afterEach(() => {
        delete (globalThis as any).chrome;
    });

    it('persists a deny to chrome.storage.local when the bucket is empty', async () => {
        const { set } = installChromeStorageMock();
        const rl = await RateLimiter.persistent(
            { logger, eventBus, storageKey: 'rate_limit:sync:user-1:sync' }
        );

        // Exhaust the sync bucket (capacity 10).
        for (let i = 0; i < 10; i++) {
            await rl.checkLimit('user-1', 'sync');
        }
        // 11th call denies.
        const blocked = await rl.checkLimit('user-1', 'sync');
        expect(blocked).toBe(false);

        // At least one chrome.storage.local.set fired for the deny.
        const denyWrites = set.mock.calls.filter(([items]) => {
            return Object.values(items as Record<string, unknown>).some(
                (v) => typeof v === 'object' && v !== null && (v as { state?: string }).state === 'denied'
            );
        });
        expect(denyWrites.length).toBeGreaterThan(0);

        rl.destroy();
    });

    it('hydrates the denied state from chrome.storage.local on construction', async () => {
        // Pre-populate storage with a recent deny.
        installChromeStorageMock({
            'rate_limit:sync:user-2:sync': { state: 'denied', since: Date.now() },
        });

        const rl = await RateLimiter.persistent(
            { logger, eventBus, storageKey: 'rate_limit:sync:user-2:sync' }
        );

        // Even though in-memory bucket is fresh (10 tokens), the persisted
        // deny state means we must NOT issue new tokens until the cooldown
        // window has passed.
        const first = await rl.checkLimit('user-2', 'sync');
        expect(first).toBe(false);

        rl.destroy();
    });

    it('fails closed (denies all checks) when chrome.storage.local is unavailable', async () => {
        // No chrome mock installed.
        const rl = await RateLimiter.persistent(
            { logger, eventBus, storageKey: 'rate_limit:sync:user-3:sync' }
        );

        const allowed = await rl.checkLimit('user-3', 'sync');
        expect(allowed).toBe(false);
        // Warned about fail-closed behavior.
        expect(logger.warn).toHaveBeenCalled();

        rl.destroy();
    });
});
