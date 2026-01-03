/**
 * @file resilient-api-client.ts
 * @description API client wrapper with retry and circuit breaker patterns
 * @architecture Decorator Pattern - wraps IAPIClient with resilience
 */

import type { IAPIClient, SyncEvent, PushResult, Collection } from './interfaces/i-api-client';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { CircuitBreaker, type CircuitBreakerConfig } from '@/shared/utils/circuit-breaker';
import { NetworkError, ServerError, AuthenticationError, ValidationError, RateLimitError } from './api-errors';

/**
 * Retry configuration for API operations
 */
export interface APIRetryConfig {
    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;

    /** Initial delay in ms (default: 100) */
    initialDelayMs?: number;

    /** Maximum delay cap in ms (default: 2000) */
    maxDelayMs?: number;

    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<APIRetryConfig> = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
};

/**
 * Default circuit breaker configuration for API
 */
const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    successThreshold: 2,
    name: 'API Client',
};

/**
 * Resilient API Client
 * Wraps IAPIClient with retry logic and circuit breaker
 * 
 * Retry on: NetworkError, ServerError (5xx)
 * Do NOT retry: AuthenticationError, ValidationError, RateLimitError
 */
export class ResilientAPIClient implements IAPIClient {
    private readonly retryConfig: Required<APIRetryConfig>;
    private readonly circuitBreaker: CircuitBreaker;

    constructor(
        private readonly inner: IAPIClient,
        private readonly logger: ILogger,
        retryConfig: APIRetryConfig = {},
        circuitConfig: Partial<CircuitBreakerConfig> = {}
    ) {
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
        this.circuitBreaker = new CircuitBreaker(
            { ...DEFAULT_CIRCUIT_CONFIG, ...circuitConfig },
            logger
        );

        this.logger.debug('ResilientAPIClient initialized', {
            retry: this.retryConfig,
            circuit: circuitConfig,
        });
    }

    // ==================== Highlight Operations ====================

    async createHighlight(data: HighlightDataV2): Promise<void> {
        return this.executeWithResilience(() => this.inner.createHighlight(data));
    }

    async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        return this.executeWithResilience(() => this.inner.updateHighlight(id, updates));
    }

    async deleteHighlight(id: string): Promise<void> {
        return this.executeWithResilience(() => this.inner.deleteHighlight(id));
    }

    async getHighlights(url?: string): Promise<HighlightDataV2[]> {
        return this.executeWithResilience(() => this.inner.getHighlights(url));
    }

    // ==================== Sync Operations ====================

    async pushEvents(events: SyncEvent[]): Promise<PushResult> {
        return this.executeWithResilience(() => this.inner.pushEvents(events));
    }

    async pullEvents(since: number): Promise<SyncEvent[]> {
        return this.executeWithResilience(() => this.inner.pullEvents(since));
    }

    // ==================== Collection Operations ====================

    async createCollection(name: string, description?: string): Promise<Collection> {
        return this.executeWithResilience(() => this.inner.createCollection(name, description));
    }

    async getCollections(): Promise<Collection[]> {
        return this.executeWithResilience(() => this.inner.getCollections());
    }

    // ==================== Resilience Logic ====================

    /**
     * Execute operation with circuit breaker and retry logic
     */
    private async executeWithResilience<T>(operation: () => Promise<T>): Promise<T> {
        return this.circuitBreaker.execute(async () => {
            return this.retryWithBackoff(operation);
        });
    }

    /**
     * Retry operation with exponential backoff
     */
    private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                // Add delay before retry (not on first attempt)
                if (attempt > 0) {
                    const delay = this.calculateBackoff(attempt);
                    this.logger.debug('Retrying API operation', {
                        attempt,
                        delayMs: delay,
                    });
                    await this.sleep(delay);
                }

                // Execute operation
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Don't retry on non-retryable errors
                if (this.isNonRetryableError(lastError)) {
                    this.logger.debug('Non-retryable error, failing fast', {
                        error: lastError.message,
                        errorType: lastError.constructor.name,
                    });
                    throw lastError;
                }

                // Log retry intent (unless last attempt)
                if (attempt < this.retryConfig.maxRetries) {
                    this.logger.warn('API operation failed, will retry', {
                        attempt,
                        error: lastError.message,
                    });
                }
            }
        }

        // All retries exhausted
        this.logger.error(
            'API operation failed after all retries',
            lastError ?? new Error('Unknown error'),
            { maxRetries: this.retryConfig.maxRetries }
        );

        throw lastError ?? new Error('API operation failed after retries');
    }

    /**
     * Calculate exponential backoff delay
     */
    private calculateBackoff(attempt: number): number {
        const exponentialDelay =
            this.retryConfig.initialDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        return Math.min(exponentialDelay, this.retryConfig.maxDelayMs);
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Check if error should NOT be retried
     * 
     * Non-retryable: AuthenticationError, ValidationError, RateLimitError
     * Retryable: NetworkError, ServerError
     */
    private isNonRetryableError(error: Error): boolean {
        // Circuit breaker open - don't retry (defeats purpose)
        if (error.name === 'CircuitBreakerOpenError') {
            return true;
        }

        // Authentication errors - need user intervention
        if (error instanceof AuthenticationError) {
            return true;
        }

        // Validation errors - permanent failures
        if (error instanceof ValidationError) {
            return true;
        }

        // Rate limit errors - should respect retry-after
        if (error instanceof RateLimitError) {
            return true;
        }

        // All other errors are retryable (NetworkError, ServerError, etc.)
        return false;
    }

    /**
     * Get circuit breaker metrics
     */
    getCircuitMetrics() {
        return this.circuitBreaker.getMetrics();
    }

    /**
     * Reset circuit breaker (for testing)
     */
    resetCircuit(): void {
        this.circuitBreaker.reset();
    }
}
