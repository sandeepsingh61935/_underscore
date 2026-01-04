/**
 * @file e2e-encryption-service.ts
 * @description End-to-end encryption service using RSA-OAEP
 * @security Encrypts highlight data before sending to server
 */

import type { IEncryptionService, EncryptedHighlight, HighlightData } from './interfaces/i-encryption-service';
import type { IKeyManager } from './interfaces/i-key-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * E2E encryption service implementation
 * 
 * @performance Target: <50ms per 1KB of data (p95)
 * @security Uses RSA-OAEP-256 for encryption
 */
export class E2EEncryptionService implements IEncryptionService {
    private readonly ENCRYPTION_VERSION = 1;

    constructor(
        private readonly keyManager: IKeyManager,
        private readonly logger: ILogger
    ) { }

    /**
     * Encrypt highlight data using hybrid encryption
     * 1. Generate random AES-256 key
     * 2. Encrypt data with AES-GCM
     * 3. Encrypt AES key with RSA-OAEP
     */
    async encrypt(data: HighlightData): Promise<EncryptedHighlight> {
        const startTime = performance.now();

        try {
            // Get user's public key (RSA)
            const publicKey = await this.keyManager.getPublicKey(data.userId);

            // Serialize data
            const plaintext = JSON.stringify(data);
            const plaintextBytes = new TextEncoder().encode(plaintext);

            // Generate random AES-256 key
            const aesKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Encrypt data with AES-GCM
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                plaintextBytes
            );

            // Export AES key
            const aesKeyBytes = await crypto.subtle.exportKey('raw', aesKey);

            // Encrypt AES key with RSA-OAEP
            const encryptedAesKey = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                publicKey,
                aesKeyBytes
            );

            // Combine: encryptedAesKey + iv + encryptedData
            const combined = this.combineEncryptedParts(
                new Uint8Array(encryptedAesKey),
                iv,
                new Uint8Array(encryptedData)
            );

            // Convert to base64
            const encryptedBase64 = this.arrayBufferToBase64(combined.buffer);

            // Get key ID from stored key
            const keyId = await this.getKeyIdForUser(data.userId);

            const duration = performance.now() - startTime;
            this.logger.debug('Data encrypted', {
                userId: data.userId,
                dataSize: plaintextBytes.length,
                duration,
            });

            return {
                version: this.ENCRYPTION_VERSION,
                keyId,
                data: encryptedBase64,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.logger.error('Encryption failed', error as Error, { userId: data.userId });
            throw new Error(`Encryption failed: ${(error as Error).message}`);
        }
    }

    /**
     * Decrypt highlight data using hybrid decryption
     * 1. Extract encrypted AES key, IV, and encrypted data
     * 2. Decrypt AES key with RSA-OAEP
     * 3. Decrypt data with AES-GCM
     */
    async decrypt(encrypted: EncryptedHighlight): Promise<HighlightData> {
        const startTime = performance.now();

        try {
            // Get user's private key (RSA)
            const privateKey = await this.keyManager.getPrivateKey(encrypted.keyId);

            // Convert from base64
            const combinedBytes = new Uint8Array(this.base64ToArrayBuffer(encrypted.data));

            // Split: encryptedAesKey (256 bytes) + iv (12 bytes) + encryptedData (rest)
            const { encryptedAesKey, iv, encryptedData } = this.splitEncryptedParts(combinedBytes);

            // Decrypt AES key with RSA-OAEP
            const aesKeyBytes = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encryptedAesKey
            );

            // Import AES key
            const aesKey = await crypto.subtle.importKey(
                'raw',
                aesKeyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt data with AES-GCM
            const decryptedBytes = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                encryptedData
            );

            // Deserialize data
            const plaintext = new TextDecoder().decode(decryptedBytes);
            const data: HighlightData = JSON.parse(plaintext);

            const duration = performance.now() - startTime;
            this.logger.debug('Data decrypted', {
                keyId: encrypted.keyId,
                duration,
            });

            return data;
        } catch (error) {
            this.logger.error('Decryption failed', error as Error, { keyId: encrypted.keyId });
            throw new Error(`Decryption failed: ${(error as Error).message}`);
        }
    }

    /**
     * Combine encrypted parts into single byte array
     * Format: [encryptedAesKey (256 bytes)] + [iv (12 bytes)] + [encryptedData]
     */
    private combineEncryptedParts(
        encryptedAesKey: Uint8Array,
        iv: Uint8Array,
        encryptedData: Uint8Array
    ): Uint8Array {
        const combined = new Uint8Array(encryptedAesKey.length + iv.length + encryptedData.length);
        combined.set(encryptedAesKey, 0);
        combined.set(iv, encryptedAesKey.length);
        combined.set(encryptedData, encryptedAesKey.length + iv.length);
        return combined;
    }

    /**
     * Split combined encrypted parts
     */
    private splitEncryptedParts(combined: Uint8Array): {
        encryptedAesKey: Uint8Array;
        iv: Uint8Array;
        encryptedData: Uint8Array;
    } {
        const encryptedAesKey = combined.slice(0, 256); // RSA-2048 = 256 bytes
        const iv = combined.slice(256, 268); // 12 bytes
        const encryptedData = combined.slice(268);
        return { encryptedAesKey, iv, encryptedData };
    }

    /**
     * Get key ID for user (helper method)
     */
    private async getKeyIdForUser(userId: string): Promise<string> {
        // In a real implementation, this would query the stored key
        // For now, we construct it based on the storage pattern
        const storageKey = `key_manager_${userId}`;
        const result = await chrome.storage.local.get(storageKey);

        if (!result[storageKey]) {
            throw new Error(`No keys found for user: ${userId}`);
        }

        return result[storageKey].keyId;
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
