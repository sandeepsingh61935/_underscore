import type { IMessageBus } from '../interfaces/i-message-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { Message, MessageTarget, MessageHandler } from '../schemas/message-schemas';

/**
 * Retry policy configuration for exponential backoff
 */
export interface RetryPolicy {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Initial delay in milliseconds before first retry (default: 100ms) */
    initialDelayMs: number;
    /** Maximum delay cap in milliseconds (default: 2000ms) */
    maxDelayMs: number;
    /** Backoff multiplier for exponential growth (default: 2) */
    backoffMultiplier: number;
}

/**
 * Default retry policy with industry-standard values
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
};

/**
 * RetryDecorator - Adds exponential backoff retry logic to IMessageBus
 *
 * Wraps an existing IMessageBus implementation and retries failed send() operations
 * using exponential backoff. Particularly useful for transient failures like:
 * - MV3 background script suspended (waking up)
 * - Temporary network issues
 * - Context not ready yet
 *
 * Does NOT retry:
 * - subscribe/publish operations (fire-and-forget pattern)
 * - Validation errors (permanent failures)
 *
 * @example
 * ```typescript
 * const baseMessageBus = new ChromeMessageBus(logger);
 * const retryMessageBus = new RetryDecorator(
 *   baseMessageBus,
 *   logger,
 *   { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 2000, backoffMultiplier: 2 }
 * );
 *
 * // Will retry up to 3 times with exponential backoff on failure
 * const result = await retryMessageBus.send('background', message);
 * ```
 */
export class RetryDecorator implements IMessageBus {
    private readonly policy: RetryPolicy;

    constructor(
        private readonly inner: IMessageBus,
        private readonly logger: ILogger,
        policy: Partial<RetryPolicy> = {}
    ) {
        this.policy = { ...DEFAULT_RETRY_POLICY, ...policy };
    }

    /**
     * Send message with retry logic
     * Retries on transient failures with exponential backoff
     */
    async send<T = unknown>(target: MessageTarget, message: Message): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.policy.maxRetries; attempt++) {
            try {
                // First attempt (attempt === 0) has no delay
                if (attempt > 0) {
                    const delay = this.calculateBackoff(attempt);
                    this.logger.debug('Retrying message send', {
                        messageType: message.type,
                        attempt,
                        delayMs: delay,
                    });
                    await this.sleep(delay);
                }

                // Attempt send
                return await this.inner.send<T>(target, message);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Don't retry on validation errors (permanent failures)
                if (this.isNonRetryableError(lastError)) {
                    this.logger.debug('Non-retryable error, failing fast', {
                        messageType: message.type,
                        error: lastError.message,
                    });
                    throw lastError;
                }

                // Log retry intent (unless this was the last attempt)
                if (attempt < this.policy.maxRetries) {
                    this.logger.warn('Message send failed, will retry', {
                        messageType: message.type,
                        attempt,
                        error: lastError.message,
                    });
                }
            }
        }

        // All retries exhausted
        this.logger.error(
            'Message send failed after all retries',
            lastError ?? new Error('Unknown error'),
            { messageType: message.type, maxRetries: this.policy.maxRetries }
        );

        throw lastError ?? new Error('Message send failed after retries');
    }

    /**
     * Subscribe to messages (no retry logic - fire-and-forget)
     * Delegates directly to inner MessageBus
     */
    subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void {
        return this.inner.subscribe(messageType, handler);
    }

    /**
     * Publish messages (no retry logic - fire-and-forget)
     * Delegates directly to inner MessageBus
     */
    async publish(messageType: string, payload: unknown): Promise<void> {
        return await this.inner.publish(messageType, payload);
    }

    /**
     * Calculate exponential backoff delay for retry attempt
     * Formula: initialDelay * (backoffMultiplier ^ (attempt - 1))
     * Capped at maxDelayMs
     */
    private calculateBackoff(attempt: number): number {
        const exponentialDelay =
            this.policy.initialDelayMs * Math.pow(this.policy.backoffMultiplier, attempt - 1);
        return Math.min(exponentialDelay, this.policy.maxDelayMs);
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Check if error is non-retryable (permanent failure)
     * Validation errors, OUR timeout mechanism, and circuit breaker open should not be retried
     */
    private isNonRetryableError(error: Error): boolean {
        // Circuit breaker open - retrying defeats the circuit breaker's purpose
        if (error.name === 'CircuitBreakerOpenError') {
            return true;
        }

        // Zod validation errors
        if (error.name === 'ZodError') {
            return true;
        }

        // Explicit non-retryable messages
        const nonRetryablePatterns = [
            /validation/i,
            /invalid.*schema/i,
            /malformed.*message/i,
            /Message send timeout after/i, // OUR timeout mechanism (not Chrome network timeouts)
        ];

        return nonRetryablePatterns.some((pattern) => pattern.test(error.message));
    }
}
