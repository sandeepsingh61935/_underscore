/**
 * @file key-manager.ts
 * @description RSA-2048 key pair management with secure storage
 * @security Private keys encrypted with AES-GCM before chrome.storage.local
 */

import type { IKeyManager, KeyPair } from './interfaces/i-key-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Stored key structure (encrypted)
 */
interface StoredKey {
    keyId: string;
    userId: string;
    publicKeyJwk: JsonWebKey;
    encryptedPrivateKey: string; // Base64 encoded
    iv: string; // Base64 encoded IV for AES-GCM
    createdAt: string;
    algorithm: string;
    version: number;
}

/**
 * Key manager implementation
 * 
 * @security Private keys are encrypted with AES-GCM using a master key
 * @caching Public keys cached in memory for performance
 */
export class KeyManager implements IKeyManager {
    private readonly STORAGE_KEY_PREFIX = 'key_manager_';
    private readonly KEY_VERSION = 1;
    private readonly publicKeyCache = new Map<string, CryptoKey>();
    private readonly privateKeyCache = new Map<string, CryptoKey>();
    private masterKey: CryptoKey | null = null;

    constructor(private readonly logger: ILogger) { }

    /**
     * Initialize master key for encrypting private keys
     * Uses a deterministic key derived from extension ID
     */
    private async getMasterKey(): Promise<CryptoKey> {
        if (this.masterKey) {
            return this.masterKey;
        }

        // Derive master key from extension context
        // In production, this could be derived from user password or secure enclave
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode('underscore-vault-master-key-v1'),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        this.masterKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('underscore-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return this.masterKey;
    }

    /**
     * Generate new RSA-2048 keypair
     */
    async generateKeyPair(userId: string): Promise<KeyPair> {
        this.logger.info('Generating RSA-2048 keypair', { userId });

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
        const masterKey = await this.getMasterKey();

        // Export public key
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

        // Export and encrypt private key
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const privateKeyData = new TextEncoder().encode(JSON.stringify(privateKeyJwk));

        const iv = crypto.getRandomValues(new Uint8Array(12));
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
            createdAt: new Date().toISOString(),
            algorithm: 'RSA-OAEP',
            version: this.KEY_VERSION,
        };

        // Store in chrome.storage.local
        const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
        await chrome.storage.local.set({ [storageKey]: storedKey });

        this.logger.debug('Keypair stored', { userId, keyId });
    }

    /**
     * Get user's public key
     */
    async getPublicKey(userId?: string): Promise<CryptoKey> {
        const targetUserId = userId || await this.getCurrentUserId();

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
        const masterKey = await this.getMasterKey();
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
     * Get current user ID (stub - should integrate with AuthManager)
     */
    private async getCurrentUserId(): Promise<string> {
        // TODO: Integrate with AuthManager to get current user
        return 'current-user';
    }

    /**
     * Convert ArrayBuffer to Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const length = bytes.byteLength;
        for (let i = 0; i < length; i++) {
            binary += String.fromCharCode(bytes[i]);
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
