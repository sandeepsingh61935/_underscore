/**
 * @file i-key-manager.ts
 * @description Cryptographic key management interface
 * @security RSA-2048 keypair generation and management
 */

/**
 * RSA key pair
 */
export interface KeyPair {
    readonly publicKey: CryptoKey;
    readonly privateKey: CryptoKey;
}

/**
 * Stored key metadata
 */
export interface KeyMetadata {
    readonly keyId: string;
    readonly userId: string;
    readonly createdAt: Date;
    readonly algorithm: string;
    readonly version: number;
}

/**
 * Key manager interface
 *
 * @responsibility Generate, store, and manage encryption keypairs
 * @security Private keys encrypted with AES-GCM before storage
 */
export interface IKeyManager {
    /**
     * Generate new RSA-2048 keypair for user
     *
     * @param userId - User ID to generate keys for
     * @returns Generated keypair
     * @throws EncryptionError if key generation fails
     */
    generateKeyPair(userId: string): Promise<KeyPair>;

    /**
     * Get user's public key
     *
     * @param userId - User ID (optional, defaults to current user)
     * @returns Public key
     * @throws Error if key not found
     */
    getPublicKey(userId?: string): Promise<CryptoKey>;

    /**
     * Get user's private key (decrypted from storage)
     *
     * @param keyId - Key ID to retrieve
     * @returns Private key (cached in memory)
     * @throws DecryptionError if key decryption fails
     */
    getPrivateKey(keyId: string): Promise<CryptoKey>;

    /**
     * Rotate user's encryption keys
     *
     * @param userId - User ID to rotate keys for
     * @returns Promise that resolves when rotation complete
     */
    rotateKey(userId: string): Promise<void>;

    /**
     * Export keys for backup
     *
     * @param userId - User ID to export keys for
     * @returns Encrypted key backup data (JSON string)
     */
    backupKey(userId: string): Promise<string>;

    /**
     * Import keys from backup
     *
     * @param backupData - Encrypted backup data
     * @returns Promise that resolves when import complete
     */
    restoreKey(backupData: string): Promise<void>;
}
