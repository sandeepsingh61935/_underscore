/**
 * @file i-encryption-service.ts
 * @description End-to-end encryption service interface
 * @security RSA-OAEP for highlight data encryption
 */

/**
 * Encrypted highlight data structure
 */
export interface EncryptedHighlight {
    /** Encryption version for key rotation support */
    readonly version: number;
    /** Key ID used for encryption */
    readonly keyId: string;
    /** Encrypted data (base64) */
    readonly data: string;
    /** Encryption timestamp */
    readonly timestamp: number;
}

/**
 * Highlight data to be encrypted
 */
export interface HighlightData {
    readonly text: string;
    readonly url: string;
    readonly selector: string;
    readonly createdAt: Date;
    readonly userId: string;
}

/**
 * End-to-end encryption service interface
 *
 * @responsibility Encrypt/decrypt highlight data before sync
 * @security RSA-OAEP (2048-bit) encryption
 * @performance Target: <50ms per 1KB of data (p95)
 */
export interface IEncryptionService {
    /**
     * Encrypt highlight data
     *
     * @param data - Highlight data to encrypt
     * @returns Encrypted highlight
     * @throws EncryptionError if encryption fails
     */
    encrypt(data: HighlightData): Promise<EncryptedHighlight>;

    /**
     * Decrypt highlight data
     *
     * @param encrypted - Encrypted highlight
     * @returns Decrypted highlight data
     * @throws DecryptionError if decryption fails or key not found
     */
    decrypt(encrypted: EncryptedHighlight): Promise<HighlightData>;
}
