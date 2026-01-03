/**
 * @file token-store.ts
 * @description Encrypted token storage with circuit breaker protection
 * @architecture Decorator Pattern (circuit breaker wrapping storage)
 * @security AES-GCM encryption with unique IV per token
 */

import type { IPersistentStorage } from '@/shared/interfaces/i-storage';
import type { ILogger } from '@/shared/utils/logger';
import type { ITokenStore, AuthToken } from './interfaces/i-token-store';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { EncryptionError, DecryptionError } from './auth-errors';
import { PersistenceError } from '@/shared/errors/app-error';

/**
 * Encrypted token data structure
 */
interface EncryptedTokenData {
    /** Encrypted token JSON */
    readonly encryptedData: string;
    /** Initialization Vector (base64) */
    readonly iv: string;
    /** Timestamp when encrypted */
    readonly timestamp: number;
}

/**
 * Token encryption service using Web Crypto API
 */
class TokenEncryption {
    private static readonly ALGORITHM = 'AES-GCM';
    private static readonly KEY_LENGTH = 256;
    private static readonly IV_LENGTH = 12; // 96 bits for GCM

    /**
     * Derive encryption key from master password
     * In production, this would use a proper key derivation function (PBKDF2)
     */
    private static async deriveKey(): Promise<CryptoKey> {
        // For now, use a fixed key (in production, derive from user password/hardware)
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode('underscore-master-key-v1-do-not-use-in-prod'),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('vault-mode-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: this.ALGORITHM, length: this.KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt authentication token with AES-GCM
     */
    static async encrypt(token: AuthToken): Promise<EncryptedTokenData> {
        try {
            // Generate unique IV for this encryption
            const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

            // Derive encryption key
            const key = await this.deriveKey();

            // Encrypt token data
            const tokenJson = JSON.stringify(token);
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: this.ALGORITHM, iv },
                key,
                new TextEncoder().encode(tokenJson)
            );

            return {
                encryptedData: this.bufferToBase64(encryptedBuffer),
                iv: this.bufferToBase64(iv.buffer),
                timestamp: Date.now(),
            };
        } catch (error) {
            throw new EncryptionError('Failed to encrypt auth token', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Decrypt authentication token
     */
    static async decrypt(encrypted: EncryptedTokenData): Promise<AuthToken> {
        try {
            // Derive encryption key
            const key = await this.deriveKey();

            // Convert base64 to buffers
            const encryptedBuffer = this.base64ToBuffer(encrypted.encryptedData);
            const iv = this.base64ToBuffer(encrypted.iv);

            // Decrypt
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: this.ALGORITHM, iv },
                key,
                encryptedBuffer
            );

            const tokenJson = new TextDecoder().decode(decryptedBuffer);
            const token = JSON.parse(tokenJson) as AuthToken;

            // Reconstruct Date objects (JSON doesn't preserve them)
            return {
                ...token,
                expiresAt: new Date(token.expiresAt),
            };
        } catch (error) {
            throw new DecryptionError('Failed to decrypt auth token', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Convert ArrayBuffer to base64 string (binary-safe)
     */
    private static bufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        // Use Buffer for proper binary-to-base64 conversion
        return Buffer.from(bytes).toString('base64');
    }

    /**
     * Convert base64 string to ArrayBuffer (binary-safe)
     */
    private static base64ToBuffer(base64: string): ArrayBuffer {
        // Use Buffer for proper base64-to-binary conversion
        const buffer = Buffer.from(base64, 'base64');
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
}

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
     * Save authentication token (encrypted)
     */
    async saveToken(token: AuthToken): Promise<void> {
        this.logger.debug('Saving auth token', { userId: token.userId });

        try {
            // Encrypt token
            const encrypted = await TokenEncryption.encrypt(token);

            // Save via circuit breaker
            await this.circuitBreaker.execute(async () => {
                const key = this.getStorageKey(token.userId);
                await this.storage.save(key, encrypted);
            });

            this.logger.info('Auth token saved successfully', {
                userId: token.userId,
            });
        } catch (error) {
            this.logger.error('Failed to save auth token', error as Error, {
                userId: token.userId,
            });

            // Don't wrap circuit breaker errors or encryption errors
            if (error instanceof EncryptionError || (error instanceof Error && error.name === 'CircuitBreakerOpenError')) {
                throw error;
            }

            //  Wrap other storage errors
            throw new PersistenceError('Token storage failed', {
                userId: token.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Retrieve authentication token (decrypted)
     */
    async getToken(userId: string): Promise<AuthToken | null> {
        this.logger.debug('Loading auth token', { userId });

        try {
            // Load via circuit breaker
            const encrypted = await this.circuitBreaker.execute(async () => {
                const key = this.getStorageKey(userId);
                return await this.storage.load<EncryptedTokenData>(key);
            });

            if (!encrypted) {
                this.logger.debug('No token found for user', { userId });
                return null;
            }

            // Decrypt token
            const token = await TokenEncryption.decrypt(encrypted);

            this.logger.info('Auth token loaded successfully', { userId });
            return token;
        } catch (error) {
            this.logger.error('Failed to load auth token', error as Error, {
                userId,
            });

            // Return null for decryption errors (likely corrupted data)
            if (error instanceof DecryptionError) {
                this.logger.warn('Token decryption failed - data may be corrupted', {
                    userId,
                });
                return null;
            }

            // Don't wrap circuit breaker errors
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
