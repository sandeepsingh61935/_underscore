/**
 * @file key-manager.test.ts
 * @description Unit tests for KeyManager
 * @testing-strategy Real crypto APIs, mock chrome.storage, tricky edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyManager } from '@/background/auth/key-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';

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

const TEST_PASSPHRASE = 'test-passphrase-correct-horse-battery-staple';
const TEST_KDF_ITERATIONS = 1; // Tests only need a valid PBKDF2 derivation, not 600k

describe('KeyManager', () => {
    let keyManager: KeyManager;
    let mockLogger: ILogger;
    let mockAuthManager: IAuthManager;
    const testUserId = 'user-123';

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

        mockAuthManager = {
            currentUser: { id: testUserId, email: 'test@example.com', displayName: 'Test User' },
            isAuthenticated: true,
            signIn: vi.fn(),
            signOut: vi.fn(),
            refreshToken: vi.fn(),
            onAuthStateChanged: vi.fn(),
        } as unknown as IAuthManager;

        keyManager = new KeyManager(mockLogger, mockAuthManager);
    });

    /**
     * Helper: seed a v2 StoredKey for a user, then unlock the vault.
     *
     * `generateKeyPair` calls `storeKeyPair` (which now writes a fresh salt +
     * 600_000-iteration KDF) and writes the resulting blob. To test the
     * `unlock -> getPrivateKey` round trip, we seed a pre-derived blob with
     * a low iteration count so the suite stays fast.
     */
    async function seedAndUnlock(userId: string, passphrase: string = TEST_PASSPHRASE): Promise<void> {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        const masterKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: TEST_KDF_ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        const keyPair = await crypto.subtle.generateKey(
            { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            true,
            ['encrypt', 'decrypt']
        );
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const privateKeyData = new TextEncoder().encode(JSON.stringify(privateKeyJwk));

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            masterKey,
            privateKeyData
        );

        const storageKey = `key_manager_${userId}`;
        mockStorage.set(storageKey, {
            keyId: `${userId}_${Date.now()}`,
            userId,
            publicKeyJwk,
            encryptedPrivateKey: bufferToBase64(encrypted),
            iv: bufferToBase64(iv.buffer),
            salt: bufferToBase64(salt.buffer),
            kdfIterations: TEST_KDF_ITERATIONS,
            createdAt: new Date().toISOString(),
            algorithm: 'RSA-OAEP',
            version: 2,
        });

        // Re-import the same passphrase via the manager to keep the master key
        // pinned to the same salt/iterations stored in the fixture.
        await keyManager.unlock(userId, passphrase);
    }

    function bufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            // Loop bound guarantees `bytes[i]` is defined here.
            binary += String.fromCharCode(bytes[i] as number);
        }
        return btoa(binary);
    }

    describe('generateKeyPair()', () => {
        it('should generate RSA-2048 keypair and store it', async () => {
            const userId = 'user-123';
            await keyManager.unlock(userId, TEST_PASSPHRASE);

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
            expect(storedKey.salt).toBeDefined();
            expect(storedKey.kdfIterations).toBeDefined();
            expect(storedKey.algorithm).toBe('RSA-OAEP');
            expect(storedKey.version).toBe(2);
        });

        it('should throw when vault is locked', async () => {
            await expect(keyManager.generateKeyPair('user-locked')).rejects.toThrow('Vault locked');
        });

        it('should generate unique keys for different users', async () => {
            await keyManager.unlock('user-1', TEST_PASSPHRASE);
            const keyPair1 = await keyManager.generateKeyPair('user-1');
            await keyManager.unlock('user-2', TEST_PASSPHRASE);
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
            await keyManager.unlock('user-fail', TEST_PASSPHRASE);

            await expect(keyManager.generateKeyPair('user-fail')).rejects.toThrow('Key generation failed');

            // Restore
            crypto.subtle.generateKey = originalGenerateKey;
        });
    });

    describe('getPublicKey()', () => {
        it('should retrieve public key from storage', async () => {
            const userId = 'user-123';
            await keyManager.unlock(userId, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(userId);

            const publicKey = await keyManager.getPublicKey(userId);

            expect(publicKey).toBeInstanceOf(CryptoKey);
            expect(publicKey.type).toBe('public');
        });

        it('should cache public key in memory', async () => {
            const userId = 'user-123';
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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
            await keyManager.unlock(userId, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(userId);

            await expect(keyManager.getPrivateKey('wrong-key-id')).rejects.toThrow();
        });

        it('should throw when vault is locked', async () => {
            await expect(keyManager.getPrivateKey('user-locked_key')).rejects.toThrow('Vault is locked');
        });
    });

    describe('rotateKey()', () => {
        it('should generate new keypair and invalidate caches', async () => {
            const userId = 'user-123';
            await keyManager.unlock(userId, TEST_PASSPHRASE);

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
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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
            await keyManager.unlock(user1, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(user1);
            await keyManager.unlock(user2, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(user2);

            const key1 = mockStorage.get(`key_manager_${user1}`);
            const key2 = mockStorage.get(`key_manager_${user2}`);

            expect(key1.iv).not.toBe(key2.iv);
        });

        it('should handle concurrent key generation requests', async () => {
            const userId = 'user-concurrent';
            await keyManager.unlock(userId, TEST_PASSPHRASE);

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
            await keyManager.unlock(userId, TEST_PASSPHRASE);

            await keyManager.generateKeyPair(userId);
            await keyManager.getPublicKey(userId);

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time (< 1000ms for RSA-2048 generation)
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('Integration: Encrypt/Decrypt Flow', () => {
        it('should support full encrypt/decrypt cycle with generated keys', async () => {
            const userId = 'user-integration';
            await keyManager.unlock(userId, TEST_PASSPHRASE);
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

    describe('unlock() / lock()', () => {
        it('should derive master key from passphrase and round-trip private key', async () => {
            const userId = 'user-unlock';
            await seedAndUnlock(userId);

            const storedKey = mockStorage.get(`key_manager_${userId}`);
            // Round-trip: derive the same master key from the stored salt + passphrase,
            // then decrypt the stored private key and assert keyId survives a fresh load.
            const privateKey = await keyManager.getPrivateKey(storedKey.keyId);
            expect(privateKey.type).toBe('private');
        });

        it('should reject an invalid passphrase (PBKDF2 derives a different key, AES-GCM fails)', async () => {
            const userId = 'user-bad-pass';
            await seedAndUnlock(userId, TEST_PASSPHRASE);

            // Re-derive a master key with a wrong passphrase and try to decrypt.
            // Use a fresh manager so the unlock uses the wrong passphrase.
            const badKeyManager = new KeyManager(mockLogger, mockAuthManager);
            const storedKey = mockStorage.get(`key_manager_${userId}`);
            // Unlock succeeds (it derives SOME key); decryption is what fails.
            await badKeyManager.unlock(userId, 'wrong-passphrase');
            await expect(badKeyManager.getPrivateKey(storedKey.keyId)).rejects.toThrow();
        });

        it('should throw on v1 StoredKey (deprecated format)', async () => {
            const userId = 'user-v1';
            mockStorage.set(`key_manager_${userId}`, {
                keyId: `${userId}_1`,
                userId,
                publicKeyJwk: {},
                encryptedPrivateKey: 'AAAA',
                iv: 'AAAA',
                createdAt: new Date().toISOString(),
                algorithm: 'RSA-OAEP',
                version: 1,
            });

            await expect(keyManager.unlock(userId, TEST_PASSPHRASE)).rejects.toThrow(/deprecated v1/);
        });

        it('should bootstrap a fresh vault when no StoredKey exists', async () => {
            // No prior storage entry — unlock should derive a fresh master key
            // (salted with a random per-user salt) so a subsequent storeKeyPair
            // call can persist the blob.
            await keyManager.unlock('new-user', TEST_PASSPHRASE);
            await keyManager.generateKeyPair('new-user');

            const storedKey = mockStorage.get(`key_manager_new-user`);
            expect(storedKey).toBeDefined();
            expect(storedKey.version).toBe(2);
            expect(storedKey.salt).toBeTruthy();
            expect(storedKey.kdfIterations).toBe(600_000);
        });

        it('lock() should wipe master key so subsequent ops fail', async () => {
            const userId = 'user-lock';
            await keyManager.unlock(userId, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(userId);

            keyManager.lock();

            await expect(keyManager.generateKeyPair(userId)).rejects.toThrow('Vault locked');
        });
    });

    describe('isUnlocked / currentUserId', () => {
        it('isUnlocked is false before unlock, true after, false after lock', async () => {
            expect(keyManager.isUnlocked).toBe(false);

            await keyManager.unlock('user-iso', TEST_PASSPHRASE);
            expect(keyManager.isUnlocked).toBe(true);

            keyManager.lock();
            expect(keyManager.isUnlocked).toBe(false);
        });

        it('currentUserId is null before unlock, set after, null after lock', async () => {
            expect(keyManager.currentUserId).toBeNull();

            await keyManager.unlock('user-cuid', TEST_PASSPHRASE);
            expect(keyManager.currentUserId).toBe('user-cuid');

            keyManager.lock();
            expect(keyManager.currentUserId).toBeNull();
        });
    });

    describe('generateKeyPair error wrapping', () => {
        it('locked-vault error is the exact "Vault locked for user X" string, not wrapped', async () => {
            await expect(keyManager.generateKeyPair('user-wrap')).rejects.toThrow(
                'Vault locked for user user-wrap'
            );
            // Belt-and-suspenders: ensure the wrapping prefix is NOT present.
            await expect(keyManager.generateKeyPair('user-wrap')).rejects.not.toThrow(
                'Key generation failed'
            );
        });

        it('generateKeyPair failure does not leave a stale entry in publicKeyCache', async () => {
            const userId = 'user-cache-fail';
            await keyManager.unlock(userId, TEST_PASSPHRASE);

            // Force storeKeyPair (the second step of generateKeyPair) to throw,
            // so we can verify publicKeyCache stays clean on failure.
            const originalSet = chrome.storage.local.set;
            chrome.storage.local.set = vi
                .fn()
                .mockRejectedValueOnce(new Error('Storage write failed'));

            await expect(keyManager.generateKeyPair(userId)).rejects.toThrow(
                'Key generation failed'
            );

            // After a failed generation, getPublicKey must NOT serve a cached
            // value — it should hit storage and find nothing.
            chrome.storage.local.set = originalSet;
            await expect(keyManager.getPublicKey(userId)).rejects.toThrow('No keys found');
        });
    });

    describe('getCurrentUserId() (via getPublicKey() without userId)', () => {
        it('should return the real user id from AuthManager, not the literal "current-user"', async () => {
            const userId = 'user-123';
            await keyManager.unlock(userId, TEST_PASSPHRASE);
            await keyManager.generateKeyPair(userId);

            // No explicit userId: getPublicKey should fall through to authManager.currentUser.id
            const publicKey = await keyManager.getPublicKey();
            expect(publicKey).toBeInstanceOf(CryptoKey);
            expect(publicKey.type).toBe('public');
        });

        it('should throw if no authenticated user is available', async () => {
            (mockAuthManager as any).currentUser = null;
            await expect(keyManager.getPublicKey()).rejects.toThrow('No authenticated user');
        });
    });
});
