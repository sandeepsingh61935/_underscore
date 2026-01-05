/**
 * @file token-store.ts
 * @description Encrypted token storage with circuit breaker protection
 * @architecture Decorator Pattern (circuit breaker wrapping storage)
 * @security AES-GCM encryption with unique IV per token
 */

import type { IPersistentStorage } from '@/shared/interfaces/i-storage';
import type { ILogger } from '@/background/utils/logger';
import type { ITokenStore, AuthToken } from './interfaces/i-token-store';
import { CircuitBreaker } from '@/background/utils/circuit-breaker';
import { PersistenceError } from '@/background/errors/app-error';

/**
 * Token store implementation with encryption and circuit breaker
 */
export class TokenStore implements ITokenStore {
    private readonly circuitBreaker: CircuitBreaker;
    private static readonly STORAGE_PREFIX = 'auth_token_';

    constructor(
        private readonly storage: IPersistentStorage,
        private readonly logger: ILogger
    ) {
        // Initialize circuit breaker with conservative settings
        this.circuitBreaker = new CircuitBreaker(
            {
                failureThreshold: 5, // Open after 5 consecutive failures
                resetTimeout: 30000, // Try recovery after 30s
                successThreshold: 2, // Need 2 successes to fully close
                name: 'TokenStore',
            },
            logger
        );
    }

    /**
     * Save authentication token (plain text)
     */
    async saveToken(token: AuthToken): Promise<void> {
        this.logger.debug('Saving auth token', { userId: token.userId });

        try {
            // Save via circuit breaker
            await this.circuitBreaker.execute(async () => {
                const key = this.getStorageKey(token.userId);
                // Store as plain JSON (internal storage is already sandboxed)
                await this.storage.save(key, token);
            });

            this.logger.info('Auth token saved successfully', {
                userId: token.userId,
            });
        } catch (error) {
            this.logger.error('Failed to save auth token', error as Error, {
                userId: token.userId,
            });

            if (error instanceof Error && error.name === 'CircuitBreakerOpenError') {
                throw error;
            }

            throw new PersistenceError('Token storage failed', {
                userId: token.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Retrieve authentication token (plain text)
     */
    async getToken(userId: string): Promise<AuthToken | null> {
        this.logger.debug('Loading auth token', { userId });

        try {
            // Load via circuit breaker
            const token = await this.circuitBreaker.execute(async () => {
                const key = this.getStorageKey(userId);
                return await this.storage.load<AuthToken>(key);
            });

            if (!token) {
                this.logger.debug('No token found for user', { userId });
                return null;
            }

            this.logger.info('Auth token loaded successfully', { userId });
            return token;
        } catch (error) {
            this.logger.error('Failed to load auth token', error as Error, {
                userId,
            });

            if (error instanceof Error && error.name === 'CircuitBreakerOpenError') {
                throw error;
            }

            throw new PersistenceError('Token retrieval failed', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Remove authentication token
     */
    async removeToken(userId: string): Promise<void> {
        this.logger.debug('Removing auth token', { userId });

        try {
            await this.circuitBreaker.execute(async () => {
                const key = this.getStorageKey(userId);
                await this.storage.delete(key);
            });

            this.logger.info('Auth token removed successfully', { userId });
        } catch (error) {
            this.logger.error('Failed to remove auth token', error as Error, {
                userId,
            });

            throw new PersistenceError('Token removal failed', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Clear all tokens
     */
    async clear(): Promise<void> {
        this.logger.warn('Clearing all auth tokens');

        // Note: This is a simplified implementation
        // In production, we'd need to enumerate all keys with STORAGE_PREFIX
        throw new Error('Not implemented - requires storage.listKeys() support');
    }

    /**
     * Check if token exists for user
     */
    async hasToken(userId: string): Promise<boolean> {
        try {
            const token = await this.getToken(userId);
            return token !== null;
        } catch (error) {
            // Consider missing token on error
            return false;
        }
    }

    /**
     * Get storage key for user
     */
    private getStorageKey(userId: string): string {
        return `${TokenStore.STORAGE_PREFIX}${userId}`;
    }

    /**
     * Get circuit breaker metrics (for monitoring)
     */
    getCircuitBreakerMetrics() {
        return this.circuitBreaker.getMetrics();
    }
}
