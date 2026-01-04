/**
 * @file key-manager.test.ts
 * @description Unit tests for KeyManager
 * @testing-strategy Real crypto APIs, mock chrome.storage, tricky edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyManager } from '@/background/auth/key-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';

// Mock chrome.storage.local
const mockStorage = new Map<string, any>();
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys) => {
                if (typeof keys === 'string') {
                    return Promise.resolve({ [keys]: mockStorage.get(keys) });
                }
                const result: Record<string, any> = {};
                Object.keys(keys).forEach(key => {
                    if (mockStorage.has(key)) {
                        result[key] = mockStorage.get(key);
                    }
                });
                return Promise.resolve(result);
            }),
            set: vi.fn((items) => {
                Object.entries(items).forEach(([key, value]) => {
                    mockStorage.set(key, value);
                });
                return Promise.resolve();
            }),
            remove: vi.fn((keys) => {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                keyArray.forEach(key => mockStorage.delete(key));
                return Promise.resolve();
            }),
            clear: vi.fn(() => {
                mockStorage.clear();
                return Promise.resolve();
            }),
        },
    },
} as any;

describe('KeyManager', () => {
    let keyManager: KeyManager;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockStorage.clear();
        vi.clearAllMocks();

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        keyManager = new KeyManager(mockLogger);
    });

    describe('generateKeyPair()', () => {
        it('should generate RSA-2048 keypair and store it', async () => {
            const userId = 'user-123';

            const keyPair = await keyManager.generateKeyPair(userId);

            // Verify keypair structure
            expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
            expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
            expect(keyPair.publicKey.type).toBe('public');
            expect(keyPair.privateKey.type).toBe('private');

            // Verify storage
            expect(chrome.storage.local.set).toHaveBeenCalled();
            expect(mockStorage.size).toBe(1);

            // Verify stored structure
            const storageKey = `key_manager_${userId}`;
            const storedKey = mockStorage.get(storageKey);
            expect(storedKey).toBeDefined();
            expect(storedKey.userId).toBe(userId);
            expect(storedKey.publicKeyJwk).toBeDefined();
            expect(storedKey.encryptedPrivateKey).toBeDefined();
            expect(storedKey.iv).toBeDefined();
            expect(storedKey.algorithm).toBe('RSA-OAEP');
        });

        it('should generate unique keys for different users', async () => {
            const keyPair1 = await keyManager.generateKeyPair('user-1');
            const keyPair2 = await keyManager.generateKeyPair('user-2');

            // Export and compare
            const jwk1 = await crypto.subtle.exportKey('jwk', keyPair1.publicKey);
            const jwk2 = await crypto.subtle.exportKey('jwk', keyPair2.publicKey);

            expect(jwk1.n).not.toBe(jwk2.n); // Different modulus
        });

        it('should handle key generation failure gracefully', async () => {
            // Mock crypto.subtle.generateKey to fail
            const originalGenerateKey = crypto.subtle.generateKey;
            crypto.subtle.generateKey = vi.fn().mockRejectedValue(new Error('Crypto failure'));

            await expect(keyManager.generateKeyPair('user-fail')).rejects.toThrow('Key generation failed');

            // Restore
            crypto.subtle.generateKey = originalGenerateKey;
        });
    });

    describe('getPublicKey()', () => {
        it('should retrieve public key from storage', async () => {
            const userId = 'user-123';
            await keyManager.generateKeyPair(userId);

            const publicKey = await keyManager.getPublicKey(userId);

            expect(publicKey).toBeInstanceOf(CryptoKey);
            expect(publicKey.type).toBe('public');
        });

        it('should cache public key in memory', async () => {
            const userId = 'user-123';
            await keyManager.generateKeyPair(userId);

            // First call
            await keyManager.getPublicKey(userId);
            const firstCallCount = (chrome.storage.local.get as any).mock.calls.length;

            // Second call (should use cache)
            await keyManager.getPublicKey(userId);
            const secondCallCount = (chrome.storage.local.get as any).mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount); // No additional storage call
        });

        it('should throw error if key not found', async () => {
            await expect(keyManager.getPublicKey('non-existent-user')).rejects.toThrow('No keys found');
        });
    });

    describe('getPrivateKey()', () => {
        it('should decrypt and retrieve private key', async () => {
            const userId = 'user-123';
            const keyPair = await keyManager.generateKeyPair(userId);

            const storageKey = `key_manager_${userId}`;
            const storedKey = mockStorage.get(storageKey);
            const keyId = storedKey.keyId;

            const privateKey = await keyManager.getPrivateKey(keyId);

            expect(privateKey).toBeInstanceOf(CryptoKey);
            expect(privateKey.type).toBe('private');

            // Verify it's the same key by testing encryption/decryption
            const testData = new TextEncoder().encode('test message');
            const encrypted = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                keyPair.publicKey,
                testData
            );
            const decrypted = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encrypted
            );

            expect(new TextDecoder().decode(decrypted)).toBe('test message');
        });

        it('should cache private key in memory', async () => {
            const userId = 'user-123';
            await keyManager.generateKeyPair(userId);

            const storageKey = `key_manager_${userId}`;
            const storedKey = mockStorage.get(storageKey);
            const keyId = storedKey.keyId;

            // First call
            await keyManager.getPrivateKey(keyId);
            const firstCallCount = (chrome.storage.local.get as any).mock.calls.length;

            // Second call (should use cache)
            await keyManager.getPrivateKey(keyId);
            const secondCallCount = (chrome.storage.local.get as any).mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount);
        });

        it('should throw error for key ID mismatch', async () => {
            const userId = 'user-123';
            await keyManager.generateKeyPair(userId);

            await expect(keyManager.getPrivateKey('wrong-key-id')).rejects.toThrow();
        });
    });

    describe('rotateKey()', () => {
        it('should generate new keypair and invalidate caches', async () => {
            const userId = 'user-123';

            // Generate initial key
            await keyManager.generateKeyPair(userId);
            const initialPublicKey = await keyManager.getPublicKey(userId);

            // Rotate
            await keyManager.rotateKey(userId);

            // Get new public key
            const newPublicKey = await keyManager.getPublicKey(userId);

            // Verify keys are different
            const initialJwk = await crypto.subtle.exportKey('jwk', initialPublicKey);
            const newJwk = await crypto.subtle.exportKey('jwk', newPublicKey);

            expect(initialJwk.n).not.toBe(newJwk.n);
        });
    });

    describe('backupKey() and restoreKey()', () => {
        it('should backup and restore keys successfully', async () => {
            const userId = 'user-123';
            const originalKeyPair = await keyManager.generateKeyPair(userId);

            // Backup
            const backupData = await keyManager.backupKey(userId);
            expect(backupData).toBeTruthy();
            expect(typeof backupData).toBe('string');

            // Clear storage
            mockStorage.clear();

            // Restore
            await keyManager.restoreKey(backupData);

            // Verify restored key works
            const restoredPublicKey = await keyManager.getPublicKey(userId);
            const originalJwk = await crypto.subtle.exportKey('jwk', originalKeyPair.publicKey);
            const restoredJwk = await crypto.subtle.exportKey('jwk', restoredPublicKey);

            expect(originalJwk.n).toBe(restoredJwk.n); // Same modulus
        });

        it('should handle corrupted backup data', async () => {
            const corruptedData = 'invalid-json-{{{';

            await expect(keyManager.restoreKey(corruptedData)).rejects.toThrow();
        });
    });

    describe('Edge Cases & Security', () => {
        it('should encrypt private key before storage (not plaintext)', async () => {
            const userId = 'user-123';
            await keyManager.generateKeyPair(userId);

            const storageKey = `key_manager_${userId}`;
            const storedKey = mockStorage.get(storageKey);

            // Verify private key is encrypted (base64 string, not JWK object)
            expect(typeof storedKey.encryptedPrivateKey).toBe('string');
            expect(storedKey.encryptedPrivateKey).not.toContain('kty'); // Not a JWK
            expect(storedKey.iv).toBeTruthy();
        });

        it('should use unique IV for each key storage', async () => {
            const user1 = 'user-1';
            const user2 = 'user-2';

            await keyManager.generateKeyPair(user1);
            await keyManager.generateKeyPair(user2);

            const key1 = mockStorage.get(`key_manager_${user1}`);
            const key2 = mockStorage.get(`key_manager_${user2}`);

            expect(key1.iv).not.toBe(key2.iv);
        });

        it('should handle concurrent key generation requests', async () => {
            const userId = 'user-concurrent';

            // Simulate concurrent calls
            const [keyPair1, keyPair2] = await Promise.all([
                keyManager.generateKeyPair(userId),
                keyManager.generateKeyPair(userId),
            ]);

            // Both should succeed (last one wins in storage)
            expect(keyPair1).toBeDefined();
            expect(keyPair2).toBeDefined();
        });

        it('should handle large key operations efficiently', async () => {
            const userId = 'user-perf';
            const startTime = performance.now();

            await keyManager.generateKeyPair(userId);
            const publicKey = await keyManager.getPublicKey(userId);

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time (< 1000ms for RSA-2048 generation)
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('Integration: Encrypt/Decrypt Flow', () => {
        it('should support full encrypt/decrypt cycle with generated keys', async () => {
            const userId = 'user-integration';
            const keyPair = await keyManager.generateKeyPair(userId);

            // Encrypt with public key
            const plaintext = 'Sensitive highlight data';
            const data = new TextEncoder().encode(plaintext);
            const encrypted = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                keyPair.publicKey,
                data
            );

            // Retrieve private key and decrypt
            const storageKey = `key_manager_${userId}`;
            const storedKey = mockStorage.get(storageKey);
            const privateKey = await keyManager.getPrivateKey(storedKey.keyId);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encrypted
            );

            expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
        });
    });
});
