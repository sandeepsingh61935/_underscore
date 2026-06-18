/**
 * @file rate-limiter.ts
 * @description Token bucket rate limiter for authentication protection
 * @security Prevents brute force attacks
 */

import type { ILogger } from '@/shared/utils/logger';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    /** Maximum number of attempts allowed in the window */
    readonly maxAttempts: number;
    /** Time window in milliseconds */
    readonly windowMs: number;
}

/**
 * Token bucket rate limiter implementation
 *
 * @pattern Token Bucket Algorithm
 * @security Prevents brute force attacks (5 attempts per 15min for auth)
 */
export class RateLimiter {
    private attempts = 0;
    private windowStart: number;

    constructor(
        private readonly config: RateLimiterConfig,
        private readonly logger?: ILogger
    ) {
        this.windowStart = Date.now();
    }

    /**
     * Try to acquire a token (attempt)
     *
     * @returns True if attempt allowed, false if rate limit exceeded
     */
    tryAcquire(): boolean {
        const now = Date.now();

        // Check if we need to reset the window
        if (now - this.windowStart >= this.config.windowMs) {
            // Window expired, reset
            this.attempts = 0;
            this.windowStart = now;
        }

        // Check if we have attempts remaining
        if (this.attempts >= this.config.maxAttempts) {
            this.logger?.warn('Rate limit exceeded', {
                attempts: this.attempts,
                maxAttempts: this.config.maxAttempts,
                windowMs: this.config.windowMs,
            });
            return false;
        }

        // Increment and allow
        this.attempts++;
        return true;
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.attempts = 0;
        this.windowStart = Date.now();
    }

    /**
     * Get current attempt count
     */
    getAttempts(): number {
        const now = Date.now();

        // Return 0 if window expired
        if (now - this.windowStart >= this.config.windowMs) {
            return 0;
        }

        return this.attempts;
    }

    /** Test/internal seam: hydrate from persisted state. */
    hydrate(state: PersistedState): void {
        this.attempts = state.attempts;
        this.windowStart = state.windowStart;
    }

    public getWindowStart(): number {
        return this.windowStart;
    }
}

export interface PersistentRateLimiterConfig extends RateLimiterConfig {
    /** chrome.storage.local key under which to persist state. */
    readonly storageKey: string;
}

interface PersistedState {
    attempts: number;
    windowStart: number;
}

interface PersistentLogger {
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, err?: Error, ctx?: Record<string, unknown>) => void;
    setLevel: (level: number) => void;
    getLevel: () => number;
}

function hasChromeStorage(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome?.storage?.local?.get === 'function';
}

// Augment the existing RateLimiter class with a static factory. Do NOT
// change the existing constructor — it is the in-memory variant used in
// tests and contexts without chrome.storage (web app).
declare module './rate-limiter' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace RateLimiter {
        function persistent(
            config: PersistentRateLimiterConfig,
            options: { logger?: PersistentLogger }
        ): Promise<RateLimiter>;
    }
}

// Attach the static factory to the class.
// (Top-level: assign to the existing class.)
(RateLimiter as unknown as { persistent: typeof RateLimiter.persistent }).persistent = async function persistent(
    this: unknown,
    config: PersistentRateLimiterConfig,
    options: { logger?: PersistentLogger }
): Promise<RateLimiter> {
    const limiter = new RateLimiter(config, options?.logger as unknown as ILogger | undefined);

    if (!hasChromeStorage()) {
        // Fail closed — see ADR-019 "fail closed" decision.
        options?.logger?.warn('chrome.storage.local unavailable; rate limiter is fail-closed', {
            storageKey: config.storageKey,
        });
        // Replace tryAcquire with a closure that always returns false.
        (limiter as unknown as { tryAcquire: () => Promise<boolean> | boolean }).tryAcquire =
            async () => false;
        return limiter;
    }

    // Hydrate from storage.
    try {
        const stored = await chrome.storage.local.get(config.storageKey);
        const state = stored[config.storageKey] as PersistedState | undefined;
        if (state) {
            // Reflect into private fields via a controlled setter.
            (limiter as unknown as { hydrate: (s: PersistedState) => void }).hydrate(state);
        }
    } catch (e) {
        options?.logger?.warn('rate-limiter hydrate failed; using in-memory defaults', {
            error: (e as Error).message,
        });
    }

    // Wrap tryAcquire to persist on every call.
    const originalTry = limiter.tryAcquire.bind(limiter);
    (limiter as unknown as { tryAcquire: () => Promise<boolean> | boolean }).tryAcquire =
        async function persistedTryAcquire(): Promise<boolean> {
            const allowed = originalTry();
            if (allowed && hasChromeStorage()) {
                try {
                    await chrome.storage.local.set({
                        [config.storageKey]: {
                            attempts: limiter.getAttempts(),
                            windowStart: limiter.getWindowStart(),
                        } satisfies PersistedState,
                    });
                } catch (e) {
                    options?.logger?.warn('rate-limiter persist failed', {
                        error: (e as Error).message,
                    });
                }
            }
            return allowed;
        };

    return limiter;
};
