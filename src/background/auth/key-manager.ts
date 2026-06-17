/**
 * @file key-manager.ts
 * @description RSA-2048 key pair management with secure storage
 * @security Private keys encrypted with AES-GCM using a passphrase-derived master key
 * @adr ADR-012: Master key derived from user passphrase via PBKDF2
 */

import type { IKeyManager, KeyPair } from './interfaces/i-key-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuthManager } from './interfaces/i-auth-manager';

/**
 * Stored key structure (encrypted)
 *
 * v2 (current): salt + kdfIterations stored alongside encrypted blob.
 * v1 (legacy, hardcoded PBKDF2 input): no salt/iterations; unrecoverable.
 */
interface StoredKey {
    keyId: string;
    userId: string;
    publicKeyJwk: JsonWebKey;
    encryptedPrivateKey: string; // Base64 encoded
    iv: string; // Base64 encoded IV for AES-GCM
    salt: string; // Base64-encoded 16-byte per-user salt
    kdfIterations: number; // PBKDF2 iteration count (e.g. 600_000)
    createdAt: string;
    algorithm: string;
    version: number;
}

/**
 * Key manager implementation
 *
 * @security Private keys are encrypted with AES-GCM using a passphrase-derived master key
 * @caching Public keys cached in memory for performance
 * @lifecycle Caller must invoke `unlock(userId, passphrase)` before any operation that
 *           requires the master key (generate, getPrivateKey). Call `lock()` to wipe
 *           in-memory keys (e.g. on sign-out or service worker idle).
 */
export class KeyManager implements IKeyManager {
    private readonly STORAGE_KEY_PREFIX = 'key_manager_';
    private readonly KEY_VERSION = 2;
    private readonly KDF_ITERATIONS = 600_000; // Match Bitwarden
    private readonly SALT_BYTES = 16;
    private readonly publicKeyCache = new Map<string, CryptoKey>();
    private readonly privateKeyCache = new Map<string, CryptoKey>();
    private masterKey: CryptoKey | null = null;
    private currentUserId: string | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly authManager: IAuthManager
    ) { }

    /**
     * Derive and cache the master key for a user using their passphrase.
     *
     * The passphrase is never stored. The derived AES-GCM CryptoKey lives only in
     * service-worker memory and is wiped by `lock()` (or on SW restart).
     *
     * On first unlock for a user (no StoredKey exists), a fresh per-user salt is
     * generated and used to derive the master key. The salt + iteration count are
     * stored alongside the keypair on the next `storeKeyPair()` call.
     *
     * @param userId - User ID to unlock vault for
     * @param passphrase - User-supplied vault passphrase
     * @throws Error if an existing StoredKey uses the deprecated v1 format
     *         (vault reset required)
     */
    async unlock(userId: string, passphrase: string): Promise<void> {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
        const result = await chrome.storage.local.get(storageKey);
        const existing = result[storageKey] as StoredKey | undefined;

        let salt: Uint8Array<ArrayBuffer>;
        let iterations: number;

        if (existing) {
            if (existing.version !== this.KEY_VERSION) {
                throw new Error(
                    `Vault uses deprecated v${existing.version} format — reset required`
                );
            }
            salt = new Uint8Array(this.base64ToArrayBuffer(existing.salt));
            iterations = existing.kdfIterations;
        } else {
            // First-unlock bootstrap: generate a per-user salt. The salt + KDF
            // iterations are written to storage by the next storeKeyPair() call.
            const buf = new ArrayBuffer(this.SALT_BYTES);
            salt = new Uint8Array(buf);
            crypto.getRandomValues(salt);
            iterations = this.KDF_ITERATIONS;
        }

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        this.masterKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        this.currentUserId = userId;
        this.logger.info('Vault unlocked', { userId });
    }

    /**
     * Wipe in-memory master key and cached private keys.
     *
     * Call on sign-out, vault lock, or service-worker idle. The next operation
     * that requires the master key will fail until `unlock()` is called again.
     */
    lock(): void {
        this.masterKey = null;
        this.currentUserId = null;
        this.privateKeyCache.clear();
        this.logger.info('Vault locked');
    }

    /**
     * Synchronous accessor for the master key. Throws if the vault is locked.
     */
    private getMasterKey(): CryptoKey {
        if (!this.masterKey) {
            throw new Error('Vault is locked — call unlock() first');
        }
        return this.masterKey;
    }

    /**
     * Generate new RSA-2048 keypair
     */
    async generateKeyPair(userId: string): Promise<KeyPair> {
        this.logger.info('Generating RSA-2048 keypair', { userId });

        if (!this.masterKey || this.currentUserId !== userId) {
            throw new Error(`Vault locked for user ${userId}`);
        }

        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256',
                },
                true, // extractable
                ['encrypt', 'decrypt']
            );

            // Store encrypted private key
            await this.storeKeyPair(userId, keyPair);

            // Cache public key
            this.publicKeyCache.set(userId, keyPair.publicKey);

            this.logger.info('Keypair generated and stored', { userId });

            return keyPair;
        } catch (error) {
            this.logger.error('Failed to generate keypair', error as Error, { userId });
            throw new Error(`Key generation failed: ${(error as Error).message}`);
        }
    }

    /**
     * Store keypair in chrome.storage.local (private key encrypted)
     */
    private async storeKeyPair(userId: string, keyPair: CryptoKeyPair): Promise<void> {
        const keyId = `${userId}_${Date.now()}`;
        const masterKey = this.getMasterKey();

        // Export public key
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

        // Export and encrypt private key
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const privateKeyData = new TextEncoder().encode(JSON.stringify(privateKeyJwk));

        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Preserve the existing salt/iterations if the user already has a stored
        // vault (e.g. key rotation) — the salt is per-user and must match across
        // unlock calls. On first vault creation, generate a fresh salt.
        const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
        const existing = (await chrome.storage.local.get(storageKey))[storageKey] as
            | StoredKey
            | undefined;
        const salt: Uint8Array<ArrayBuffer> = existing
            ? new Uint8Array(this.base64ToArrayBuffer(existing.salt))
            : (() => {
                  const buf = new ArrayBuffer(this.SALT_BYTES);
                  const u8 = new Uint8Array(buf);
                  crypto.getRandomValues(u8);
                  return u8;
              })();
        const kdfIterations = existing?.kdfIterations ?? this.KDF_ITERATIONS;

        const encryptedPrivateKey = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            masterKey,
            privateKeyData
        );

        const storedKey: StoredKey = {
            keyId,
            userId,
            publicKeyJwk,
            encryptedPrivateKey: this.arrayBufferToBase64(encryptedPrivateKey),
            iv: this.arrayBufferToBase64(iv.buffer),
            salt: this.arrayBufferToBase64(salt.buffer),
            kdfIterations,
            createdAt: new Date().toISOString(),
            algorithm: 'RSA-OAEP',
            version: this.KEY_VERSION,
        };

        // Store in chrome.storage.local
        await chrome.storage.local.set({ [storageKey]: storedKey });

        this.logger.debug('Keypair stored', { userId, keyId });
    }

    /**
     * Get user's public key
     */
    async getPublicKey(userId?: string): Promise<CryptoKey> {
        const targetUserId = userId || this.getCurrentUserId();

        // Check cache
        if (this.publicKeyCache.has(targetUserId)) {
            return this.publicKeyCache.get(targetUserId)!;
        }

        // Load from storage
        const storedKey = await this.loadStoredKey(targetUserId);
        const publicKey = await crypto.subtle.importKey(
            'jwk',
            storedKey.publicKeyJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );

        this.publicKeyCache.set(targetUserId, publicKey);
        return publicKey;
    }

    /**
     * Get user's private key (decrypted)
     */
    async getPrivateKey(keyId: string): Promise<CryptoKey> {
        // Check cache
        if (this.privateKeyCache.has(keyId)) {
            return this.privateKeyCache.get(keyId)!;
        }

        // Vault must be unlocked to decrypt
        const masterKey = this.getMasterKey();

        // Extract userId from keyId
        const userId = keyId.split('_')[0];
        if (!userId) {
            throw new Error(`Invalid key ID format: ${keyId}`);
        }
        const storedKey = await this.loadStoredKey(userId);

        if (storedKey.keyId !== keyId) {
            throw new Error(`Key ID mismatch: expected ${keyId}, got ${storedKey.keyId}`);
        }

        // Decrypt private key
        const iv = new Uint8Array(this.base64ToArrayBuffer(storedKey.iv));
        const encryptedData = new Uint8Array(this.base64ToArrayBuffer(storedKey.encryptedPrivateKey));

        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            masterKey,
            encryptedData
        );

        const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedData));
        const privateKey = await crypto.subtle.importKey(
            'jwk',
            privateKeyJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
        );

        this.privateKeyCache.set(keyId, privateKey);
        return privateKey;
    }

    /**
     * Rotate user's encryption keys
     */
    async rotateKey(userId: string): Promise<void> {
        this.logger.info('Rotating keys', { userId });

        // Generate new keypair
        await this.generateKeyPair(userId);

        // Clear caches
        this.publicKeyCache.delete(userId);
        this.privateKeyCache.clear();

        this.logger.info('Key rotation complete', { userId });
    }

    /**
     * Export keys for backup
     */
    async backupKey(userId: string): Promise<string> {
        const storedKey = await this.loadStoredKey(userId);
        return JSON.stringify(storedKey);
    }

    /**
     * Import keys from backup
     */
    async restoreKey(backupData: string): Promise<void> {
        const storedKey: StoredKey = JSON.parse(backupData);
        const storageKey = `${this.STORAGE_KEY_PREFIX}${storedKey.userId}`;
        await chrome.storage.local.set({ [storageKey]: storedKey });

        this.logger.info('Key restored from backup', { userId: storedKey.userId });
    }

    /**
     * Load stored key from chrome.storage.local
     */
    private async loadStoredKey(userId: string): Promise<StoredKey> {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
        const result = await chrome.storage.local.get(storageKey);

        const storedKey = result[storageKey];
        if (!storedKey) {
            throw new Error(`No keys found for user: ${userId}`);
        }

        return storedKey as StoredKey;
    }

    /**
     * Resolve the current user ID from the injected AuthManager.
     *
     * @throws Error if no user is currently authenticated
     */
    private getCurrentUserId(): string {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new Error('No authenticated user — call signIn() first');
        }
        return user.id;
    }

    /**
     * Convert ArrayBuffer to Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const length = bytes.byteLength;
        for (let i = 0; i < length; i++) {
            // Loop bound guarantees `bytes[i]` is defined here.
            binary += String.fromCharCode(bytes[i] as number);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 to ArrayBuffer
     */
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
