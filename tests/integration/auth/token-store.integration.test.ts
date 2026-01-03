/**
 * @file token-store.integration.test.ts
 * @description Realistic integration tests for TokenStore
 * @testing Risk-based testing with tricky edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenStore } from '@/background/auth/token-store';
import type { AuthToken } from '@/background/auth/interfaces/i-token-store';
import type { IPersistentStorage } from '@/shared/interfaces/i-storage';
import type { ILogger } from '@/shared/utils/logger';
import { CircuitState } from '@/shared/utils/circuit-breaker';

/**
 * Mock persistent storage implementation
 */
class MockPersistentStorage implements IPersistentStorage {
    public data = new Map<string, unknown>();
    public saveCallCount = 0;
    public loadCallCount = 0;
    public deleteCallCount = 0;
    public shouldFail = false;
    public failureCount = 0;
    public maxFailures = 0; // Fail this many times, then succeed

    async save<T>(key: string, value: T): Promise<void> {
        this.saveCallCount++;

        if (this.shouldFail || this.failureCount < this.maxFailures) {
            this.failureCount++;
            throw new Error('Storage quota exceeded');
        }

        this.data.set(key, value);
    }

    async load<T>(key: string): Promise<T | null> {
        this.loadCallCount++;

        if (this.shouldFail || this.failureCount < this.maxFailures) {
            this.failureCount++;
            throw new Error('Storage unavailable');
        }

        const value = this.data.get(key);
        return (value as T) ?? null;
    }

    async delete(key: string): Promise<void> {
        this.deleteCallCount++;

        if (this.shouldFail || this.failureCount < this.maxFailures) {
            this.failureCount++;
            throw new Error('Storage unavailable');
        }

        this.data.delete(key);
    }

    reset(): void {
        this.data.clear();
        this.saveCallCount = 0;
        this.loadCallCount = 0;
        this.deleteCallCount = 0;
        this.shouldFail = false;
        this.failureCount = 0;
        this.maxFailures = 0;
    }

    // Test helper: corrupt stored data
    corruptData(key: string): void {
        const existing = this.data.get(key);
        if (existing && typeof existing === 'object' && existing !== null) {
            // Corrupt the encrypted data to simulate bit rot or tampering
            const corrupted = {
                ...(existing as Record<string, unknown>),
                encryptedData: 'CORRUPTED_DATA_123',
            };
            this.data.set(key, corrupted);
        }
    }
}

/**
 * Mock logger (silent)
 */
class MockLogger implements ILogger {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    setLevel = vi.fn();
    getLevel = vi.fn(() => 1);
}

/**
 * Test fixture factory
 */
function createTestToken(userId = 'user-123'): AuthToken {
    return {
        accessToken: 'access_token_abc123',
        refreshToken: 'refresh_token_xyz789',
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        userId,
        provider: 'google',
        scopes: ['profile', 'email'],
    };
}

describe('TokenStore Integration Tests', () => {
    let tokenStore: TokenStore;
    let mockStorage: MockPersistentStorage;
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockStorage = new MockPersistentStorage();
        mockLogger = new MockLogger();
        tokenStore = new TokenStore(mockStorage, mockLogger);
    });

    afterEach(() => {
        mockStorage.reset();
        vi.clearAllMocks();
    });

    /**
     * Test 1: TRICKY - Encryption round-trip with special characters
     */
    it('should encrypt and decrypt tokens with special characters in userId', async () => {
        // Arrange: Token with special characters that could break base64/JSON
        const token: AuthToken = {
            ...createTestToken(),
            userId: 'user+test@example.com/path?query=value&special=<>"\\',
            accessToken: 'token_with_unicode_😀_emoji',
        };

        // Act: Save and retrieve
        await tokenStore.saveToken(token);

        // Debug: Check what's in storage
        console.log('Storage keys:', Array.from(mockStorage.data.keys()));
        console.log('Error calls:', mockLogger.error.mock.calls);

        const retrieved = await tokenStore.getToken(token.userId);

        // Assert: Perfect round-trip
        expect(retrieved).toBeDefined();
        expect(retrieved?.userId).toBe(token.userId);
        expect(retrieved?.accessToken).toBe(token.accessToken);
        expect(retrieved?.expiresAt.getTime()).toBe(token.expiresAt.getTime());
        expect(mockStorage.saveCallCount).toBe(1);
        expect(mockStorage.loadCallCount).toBe(1);
    });

    /**
     * Test 2: REALISTIC - Circuit breaker opens after storage quota exceeded
     */
    it('should open circuit breaker after 5 consecutive storage failures', async () => {
        // Arrange: Storage that always fails
        mockStorage.shouldFail = true;
        const token = createTestToken();

        // Act: Try to save 5 times (should hit threshold)
        const attempts = [];
        for (let i = 0; i < 5; i++) {
            attempts.push(tokenStore.saveToken(token).catch((e) => e));
        }
        await Promise.all(attempts);

        // Assert: Circuit breaker opened
        const metrics = tokenStore.getCircuitBreakerMetrics();
        expect(metrics.state).toBe(CircuitState.OPEN);
        expect(metrics.failures).toBe(5);

        // Act: 6th attempt should fail fast (no storage call)
        const saveBefore = mockStorage.saveCallCount;
        const error = await tokenStore.saveToken(token).catch((e) => e);

        // Assert: Failed fast without calling storage
        expect(error.message).toContain('Circuit breaker');
        expect(mockStorage.saveCallCount).toBe(saveBefore); // No additional call
    });

    /**
     * Test 3: TRICKY - Circuit breaker recovers after timeout (HALF_OPEN)
     */
    it('should transition to HALF_OPEN and close circuit after recovery', async () => {
        // Arrange: Storage fails 5 times, then succeeds
        mockStorage.maxFailures = 5;
        const token = createTestToken();

        // Act: Trigger circuit open
        for (let i = 0; i < 5; i++) {
            await tokenStore.saveToken(token).catch(() => { });
        }

        expect(tokenStore.getCircuitBreakerMetrics().state).toBe(CircuitState.OPEN);

        // Act: Wait for reset timeout (30s) - use fake timers
        vi.useFakeTimers();
        vi.advanceTimersByTime(31000); // 31 seconds

        // Act: Storage now works, try save
        await tokenStore.saveToken(token);

        // Assert: Circuit should be HALF_OPEN, then CLOSED after 2 successes
        expect(mockStorage.saveCallCount).toBeGreaterThan(5);

        // One more success to fully close
        await tokenStore.saveToken(token);

        const metrics = tokenStore.getCircuitBreakerMetrics();
        expect(metrics.state).toBe(CircuitState.CLOSED);

        vi.useRealTimers();
    });

    /**
     * Test 4: REALISTIC - Concurrent token saves for different users
     */
    it('should handle concurrent token saves without race conditions', async () => {
        // Arrange: Multiple tokens
        const tokens = [
            createTestToken('user-1'),
            createTestToken('user-2'),
            createTestToken('user-3'),
            createTestToken('user-4'),
            createTestToken('user-5'),
        ];

        // Act: Save all concurrently
        await Promise.all(tokens.map((token) => tokenStore.saveToken(token)));

        // Assert: All tokens saved correctly
        for (const token of tokens) {
            const retrieved = await tokenStore.getToken(token.userId);
            expect(retrieved).toBeDefined();
            expect(retrieved?.userId).toBe(token.userId);
            expect(retrieved?.accessToken).toBe(token.accessToken);
        }

        expect(mockStorage.saveCallCount).toBe(5);
    });

    /**
     * Test 5: TRICKY - Corrupted token data returns null (graceful degradation)
     */
    it('should return null for corrupted token data instead of throwing', async () => {
        // Arrange: Save valid token
        const token = createTestToken();
        await tokenStore.saveToken(token);

        // Act: Corrupt the stored data
        const key = `auth_token_${token.userId}`;
        mockStorage.corruptData(key);

        // Act: Try to retrieve
        const retrieved = await tokenStore.getToken(token.userId);

        // Assert: Returns null gracefully (no throw)
        expect(retrieved).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Token decryption failed'),
            expect.any(Object)
        );
    });

    /**
     * Test 6: REALISTIC - Token expiry not enforced by TokenStore (domain logic)
     */
    it('should retrieve expired tokens without filtering (storage layer concern only)', async () => {
        // Arrange: Token expired 1 hour ago
        const token: AuthToken = {
            ...createTestToken(),
            expiresAt: new Date(Date.now() - 3600 * 1000),
        };

        // Act: Save and retrieve
        await tokenStore.saveToken(token);
        const retrieved = await tokenStore.getToken(token.userId);

        // Assert: Token retrieved (expiry check is AuthManager's job)
        expect(retrieved).not.toBeNull();
        if (retrieved) {
            expect(retrieved.expiresAt.getTime()).toBeLessThan(Date.now());
        }
        // NOTE: This is CORRECT - TokenStore is dumb storage, not domain logic
    });

    /**
     * Test 7: TRICKY - hasToken() should not throw on circuit breaker OPEN
     */
    it('should return false from hasToken() when circuit breaker is OPEN', async () => {
        // Arrange: Open circuit breaker
        mockStorage.shouldFail = true;
        const token = createTestToken();

        for (let i = 0; i < 5; i++) {
            await tokenStore.saveToken(token).catch(() => { });
        }

        expect(tokenStore.getCircuitBreakerMetrics().state).toBe(CircuitState.OPEN);

        // Act: Check if token exists
        const exists = await tokenStore.hasToken(token.userId);

        // Assert: Returns false gracefully (doesn't throw)
        expect(exists).toBe(false);
    });

    /**
     * Test 8: REALISTIC - Each token gets unique IV (no IV reuse)
     */
    it('should use unique IV for each encryption (security requirement)', async () => {
        // Arrange: Same token saved twice
        const token = createTestToken();

        // Act: Save first time
        await tokenStore.saveToken(token);
        const stored1 = mockStorage.data.get('auth_token_user-123') as Record<
            string,
            unknown
        >;

        // Act: Update (save again)
        await tokenStore.removeToken(token.userId);
        await tokenStore.saveToken(token);
        const stored2 = mockStorage.data.get('auth_token_user-123') as Record<
            string,
            unknown
        >;

        // Assert: Different IVs even for same plaintext
        expect(stored1.iv).toBeDefined();
        expect(stored2.iv).toBeDefined();
        expect(stored1.iv).not.toBe(stored2.iv);

        // Assert: Different encrypted data (because different IV)
        expect(stored1.encryptedData).not.toBe(stored2.encryptedData);

        // This is CRITICAL for AES-GCM security!
    });
});
