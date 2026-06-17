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
     * Derive and cache the master key for a user from their passphrase.
     *
     * The passphrase is never stored. The derived AES-GCM CryptoKey lives
     * only in service-worker memory and is wiped by `lock()` (or on SW
     * restart). On first unlock for a user (no StoredKey exists), a fresh
     * per-user salt is generated and cached.
     *
     * @param userId - User ID to unlock vault for
     * @param passphrase - User-supplied vault passphrase
     * @throws Error if an existing StoredKey uses a deprecated format
     */
    unlock(userId: string, passphrase: string): Promise<void>;

    /**
     * Wipe in-memory master key and cached private keys.
     *
     * Call on sign-out, vault lock, or service-worker idle.
     */
    lock(): void;

    /**
     * True if a master key is currently cached in memory.
     */
    readonly isUnlocked: boolean;

    /**
     * User ID for which the vault is currently unlocked, or `null` if locked.
     */
    readonly currentUserId: string | null;

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
