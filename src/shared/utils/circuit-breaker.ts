/**
 * @file circuit-breaker.ts
 * @description Circuit breaker pattern implementation for storage resilience
 */

import type { ILogger } from '@/shared/utils/logger';

/**
 * Circuit breaker states
 */
export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing fast
    HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    /** Number of consecutive failures before opening circuit */
    readonly failureThreshold: number;

    /** Timeout in ms before transitioning from OPEN to HALF_OPEN */
    readonly resetTimeout: number;

    /** Number of consecutive successes needed to close circuit from HALF_OPEN */
    readonly successThreshold: number;

    /** Optional name for logging */
    readonly name?: string;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
    readonly state: CircuitState;
    readonly failures: number;
    readonly successes: number;
    readonly lastFailureTime?: number;
    readonly lastStateChange: number;
    readonly totalCalls: number;
    readonly rejectedCalls: number;
}

/**
 * Error thrown when circuit is OPEN
 */
export class CircuitBreakerOpenError extends Error {
    constructor(circuitName: string) {
        super(`Circuit breaker "${circuitName}" is OPEN - failing fast`);
        this.name = 'CircuitBreakerOpenError';
    }
}

/**
 * Circuit Breaker implementation
 * 
 * Protects operations from cascading failures by:
 * - CLOSED: Normal operation, tracking failures
 * - OPEN: After N failures, reject immediately (fail fast)
 * - HALF_OPEN: After timeout, allow test calls to check recovery
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: number;
    private lastStateChangeTime: number;
    private totalCalls = 0;
    private rejectedCalls = 0;

    constructor(
        private readonly config: CircuitBreakerConfig,
        private readonly logger: ILogger
    ) {
        this.lastStateChangeTime = Date.now();
        this.logger.debug('Circuit breaker initialized', {
            name: this.config.name,
            config: this.config,
        });
    }

    /**
     * Execute an operation through the circuit breaker
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        this.totalCalls++;

        // Check if circuit is OPEN
        if (this.state === CircuitState.OPEN) {
            // Check if timeout elapsed
            if (this.shouldAttemptReset()) {
                this.transitionTo(CircuitState.HALF_OPEN);
            } else {
                // Still OPEN, reject immediately
                this.rejectedCalls++;
                throw new CircuitBreakerOpenError(this.config.name ?? 'unnamed');
            }
        }

        // Execute operation
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Get current circuit state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get circuit breaker metrics
     */
    getMetrics(): CircuitBreakerMetrics {
        return {
            state: this.state,
            failures: this.failureCount,
            successes: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastStateChange: this.lastStateChangeTime,
            totalCalls: this.totalCalls,
            rejectedCalls: this.rejectedCalls,
        };
    }

    /**
     * Reset circuit breaker (useful for testing)
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.lastStateChangeTime = Date.now();
        this.totalCalls = 0;
        this.rejectedCalls = 0;
    }

    /**
     * Handle successful operation
     */
    private onSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;

            if (this.successCount >= this.config.successThreshold) {
                // Enough successes to close circuit
                this.transitionTo(CircuitState.CLOSED);
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success
            this.failureCount = 0;
        }
    }

    /**
     * Handle failed operation
     */
    private onFailure(): void {
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            // Failure in HALF_OPEN immediately re-opens circuit
            this.transitionTo(CircuitState.OPEN);
        } else if (this.state === CircuitState.CLOSED) {
            this.failureCount++;

            if (this.failureCount >= this.config.failureThreshold) {
                // Threshold reached, open circuit
                this.transitionTo(CircuitState.OPEN);
            }
        }
    }

    /**
     * Check if circuit should attempt reset to HALF_OPEN
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) {
            return false;
        }

        const now = Date.now();
        const timeSinceLastFailure = now - this.lastFailureTime;

        return timeSinceLastFailure >= this.config.resetTimeout;
    }

    /**
     * Transition to a new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;

        if (oldState === newState) {
            return; // No change
        }

        this.state = newState;
        this.lastStateChangeTime = Date.now();

        // Reset counters based on new state
        if (newState === CircuitState.CLOSED) {
            this.failureCount = 0;
            this.successCount = 0;
        } else if (newState === CircuitState.HALF_OPEN) {
            this.successCount = 0;
        }

        // Log state change
        this.logStateChange(oldState, newState);
    }

    /**
     * Log state transition
     */
    private logStateChange(from: CircuitState, to: CircuitState): void {
        const context = {
            from,
            to,
            state: to,
            failures: this.failureCount,
            successes: this.successCount,
            totalCalls: this.totalCalls,
            rejectedCalls: this.rejectedCalls,
        };

        if (to === CircuitState.OPEN) {
            this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`, context);
        } else if (to === CircuitState.CLOSED) {
            this.logger.info('Circuit breaker closed - service recovered', context);
        } else if (to === CircuitState.HALF_OPEN) {
            this.logger.info('Circuit breaker HALF_OPEN - testing recovery', context);
        }
    }
}
